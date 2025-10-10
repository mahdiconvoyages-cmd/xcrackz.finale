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
      throw new Error('Clé API Mollie non configurée');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { id: paymentId } = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const mollieResponse = await fetch(
      `https://api.mollie.com/v2/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mollieApiKey}`,
        },
      }
    );

    if (!mollieResponse.ok) {
      throw new Error('Failed to fetch payment from Mollie');
    }

    const payment = await mollieResponse.json();
    const { transaction_id, user_id, credits } = payment.metadata;

    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (fetchError) {
      console.error('Transaction fetch error:', fetchError);
      throw fetchError;
    }

    if (transaction.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ message: 'Already processed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (payment.status === 'paid') {
      await supabase
        .from('transactions')
        .update({ payment_status: 'paid' })
        .eq('id', transaction_id);

      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_balance')
        .eq('user_id', user_id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw creditsError;
      }

      if (userCredits) {
        await supabase
          .from('user_credits')
          .update({
            credits_balance: userCredits.credits_balance + parseInt(credits),
          })
          .eq('user_id', user_id);
      } else {
        await supabase
          .from('user_credits')
          .insert([{
            user_id,
            credits_balance: parseInt(credits),
          }]);
      }

      return new Response(
        JSON.stringify({ message: 'Payment processed successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired') {
      await supabase
        .from('transactions')
        .update({ payment_status: payment.status })
        .eq('id', transaction_id);

      return new Response(
        JSON.stringify({ message: `Payment ${payment.status}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Payment status unchanged' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});