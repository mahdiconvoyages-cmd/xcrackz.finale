import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mollieApiKey = Deno.env.get('MOLLIE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    if (!mollieApiKey) {
      throw new Error('Clé API Mollie non configurée. Veuillez configurer MOLLIE_API_KEY dans les secrets Supabase.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { package_id, user_id, amount, credits } = await req.json();

    if (!package_id || !user_id || !amount || !credits) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id,
          package_id,
          amount,
          credits,
          payment_status: 'pending',
        },
      ])
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }

    const mollieResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mollieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: 'EUR',
          value: amount.toFixed(2),
        },
        description: `Achat de ${credits} crédits`,
        redirectUrl: `${req.headers.get('origin') || 'https://your-domain.com'}/shop?payment=success`,
        webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
        metadata: {
          transaction_id: transaction.id,
          user_id,
          credits,
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorText = await mollieResponse.text();
      console.error('Mollie error:', errorText);
      throw new Error('Failed to create Mollie payment');
    }

    const payment = await mollieResponse.json();

    await supabase
      .from('transactions')
      .update({ payment_id: payment.id })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({
        checkoutUrl: payment._links.checkout.href,
        paymentId: payment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});