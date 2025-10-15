-- =========================================
-- ÉTAPE 5 : INSÉRER LES DONNÉES
-- Exécuter APRÈS l'étape 4
-- =========================================

-- Insérer les réponses automatiques
INSERT INTO support_auto_responses (keywords, response, category, priority, is_active) VALUES
(
  ARRAY['bonjour', 'hello', 'salut', 'hey'],
  'Bonjour ! Merci de nous contacter. Comment puis-je vous aider aujourd''hui ?',
  'greeting',
  10,
  true
),
(
  ARRAY['prix', 'tarif', 'coût', 'combien', 'paiement', 'facturation'],
  'Pour toute question concernant nos tarifs, je vous invite à consulter notre page Boutique où vous trouverez tous nos plans détaillés. Un administrateur pourra également vous répondre sous peu pour toute question spécifique.',
  'billing',
  8,
  true
),
(
  ARRAY['crédit', 'crédits', 'recharger', 'acheter'],
  'Vous pouvez acheter des crédits directement depuis la page Boutique. Chaque mission coûte 1 crédit. Le GPS tracking et les inspections sont gratuits ! Un administrateur reste disponible si vous avez des questions.',
  'billing',
  9,
  true
),
(
  ARRAY['bug', 'erreur', 'problème', 'fonctionne pas', 'ne marche pas'],
  'Je suis désolé d''apprendre que vous rencontrez un problème technique. J''ai transmis votre message à notre équipe technique qui vous répondra dans les plus brefs délais. Pouvez-vous décrire précisément le problème rencontré ?',
  'technical',
  10,
  true
),
(
  ARRAY['mission', 'créer mission', 'nouvelle mission'],
  'Pour créer une mission, rendez-vous dans la section "Missions" puis cliquez sur "Nouvelle Mission". Vous aurez besoin de 1 crédit par mission. Besoin d''aide supplémentaire ? Un admin vous répondra bientôt !',
  'general',
  7,
  true
),
(
  ARRAY['gps', 'tracking', 'suivi', 'localisation'],
  'Le tracking GPS est totalement GRATUIT ! Il fait partie de l''état des lieux. Vous pouvez suivre vos missions en temps réel sans consommer de crédits. Un administrateur reste disponible pour plus d''informations.',
  'general',
  8,
  true
),
(
  ARRAY['inspection', 'état des lieux', 'photos'],
  'Les inspections de départ et d''arrivée sont entièrement gratuites et illimitées ! Vous pouvez prendre autant de photos que nécessaire. Un administrateur peut vous aider si besoin.',
  'general',
  7,
  true
),
(
  ARRAY['compte', 'profil', 'mot de passe', 'email'],
  'Pour gérer votre compte, rendez-vous dans la section Paramètres. Vous pouvez y modifier vos informations personnelles et votre mot de passe. Un administrateur vous répondra sous peu si vous avez besoin d''aide supplémentaire.',
  'account',
  6,
  true
),
(
  ARRAY['merci', 'thank', 'thanks'],
  'Je vous en prie ! N''hésitez pas si vous avez d''autres questions. Notre équipe est là pour vous aider.',
  'general',
  5,
  true
),
(
  ARRAY['annuler', 'supprimer', 'résilier'],
  'Pour toute demande d''annulation ou de résiliation, un administrateur va examiner votre demande et vous répondre rapidement. Pouvez-vous préciser ce que vous souhaitez annuler ?',
  'account',
  9,
  true
);

-- Vérification
SELECT category, COUNT(*) as count
FROM support_auto_responses
GROUP BY category
ORDER BY category;
