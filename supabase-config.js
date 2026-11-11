/**
 * DECK LEBLON — SUPABASE CONFIG
 * 
 * Para configurar:
 * 1. Acesse https://supabase.com e crie um projeto.
 * 2. Em Project Settings > API, copie a "Project URL" e a "anon public" key.
 * 3. Substitua os valores abaixo.
 * 4. No Supabase, crie a tabela "menu_items" com o SQL abaixo em SQL Editor:
 *
 * -- Tabela de itens do cardápio
 * CREATE TABLE menu_items (
 *   id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name        TEXT NOT NULL,
 *   description TEXT,
 *   price       NUMERIC(10,2) NOT NULL,
 *   category    TEXT NOT NULL DEFAULT 'Outros',
 *   image_url   TEXT,
 *   available   BOOLEAN DEFAULT TRUE,
 *   created_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Storage bucket para imagens
 * INSERT INTO storage.buckets (id, name, public)
 * VALUES ('menu-images', 'menu-images', true);
 *
 * -- Policy pública de leitura de imagens
 * CREATE POLICY "Public read images"
 * ON storage.objects FOR SELECT
 * USING (bucket_id = 'menu-images');
 *
 * -- Policy para upload (via service role ou autenticado)
 * CREATE POLICY "Public insert images"
 * ON storage.objects FOR INSERT
 * WITH CHECK (bucket_id = 'menu-images');
 *
 * -- Policy RLS para menu_items (leitura pública)
 * ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Anyone can read menu_items"
 * ON menu_items FOR SELECT USING (true);
 * CREATE POLICY "Anyone can insert menu_items"
 * ON menu_items FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Anyone can update menu_items"
 * ON menu_items FOR UPDATE USING (true);
 * CREATE POLICY "Anyone can delete menu_items"
 * ON menu_items FOR DELETE USING (true);
 */

const SUPABASE_URL = 'https://legfbwmtwnhjbbrkwojz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U_JpH34Jipi6kcq_vGZOTg_57ntP0kS';

// Detecta se está configurado
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
