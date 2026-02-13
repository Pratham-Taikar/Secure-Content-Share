import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateShareToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const { contentId, allowedEmails, expiryMinutes } = await req.json();

    if (!contentId || !allowedEmails || !expiryMinutes) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: contentId, allowedEmails, expiryMinutes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate expiry range
    const expiry = parseInt(expiryMinutes);
    if (isNaN(expiry) || expiry < 1 || expiry > 10080) {
      return new Response(
        JSON.stringify({ error: 'expiryMinutes must be between 1 and 10080 (7 days)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(allowedEmails) || allowedEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'allowedEmails must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = allowedEmails.filter((email: string) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format', invalidEmails }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify content ownership
    const { data: content, error: contentError } = await supabaseAdmin
      .from('contents')
      .select('id, owner_id, title')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (content.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'You do not own this content' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shareToken = generateShareToken();
    const expiresAt = new Date(Date.now() + expiry * 60 * 1000).toISOString();
    const normalizedEmails = allowedEmails.map((email: string) => email.toLowerCase().trim());

    const { data: shareLink, error: shareLinkError } = await supabaseAdmin
      .from('share_links')
      .insert({
        content_id: contentId,
        owner_id: userId,
        share_token: shareToken,
        allowed_emails: normalizedEmails,
        expires_at: expiresAt,
        expiry_minutes: expiry,
        is_active: true,
      })
      .select()
      .single();

    if (shareLinkError) {
      console.error('Share link insert error:', shareLinkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create share link', details: shareLinkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin.from('access_logs').insert({
      user_id: userId,
      content_id: contentId,
      share_token: shareToken,
      event_type: 'LINK_CREATED',
      user_agent: req.headers.get('user-agent'),
    });

    return new Response(
      JSON.stringify({
        shareToken,
        expiresAt,
        expiryMinutes: expiry,
        allowedEmails: normalizedEmails,
        contentTitle: content.title,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
