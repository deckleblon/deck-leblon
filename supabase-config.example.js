/**
 * DECK LEBLON — SUPABASE CONFIG (exemplo)
 * 
 * Copie este arquivo como "supabase-config.js" e preencha com suas credenciais.
 * O arquivo supabase-config.js está no .gitignore e NÃO é enviado ao repositório.
 */

const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL !== 'SUA_SUPABASE_URL_AQUI' &&
  SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI';

let supabaseClient = null;

if (IS_SUPABASE_CONFIGURED) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

window.deckSupabase = {
  client: supabaseClient,
  isConfigured: IS_SUPABASE_CONFIGURED,
};
