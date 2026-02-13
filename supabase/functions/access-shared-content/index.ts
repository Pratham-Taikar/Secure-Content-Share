import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'You must be logged in to access shared content' }),
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
    const userEmail = (claimsData.claims.email as string)?.toLowerCase().trim();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not found in token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { shareToken } = await req.json();

    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: shareToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: shareLink, error: shareLinkError } = await supabaseAdmin
      .from('share_links')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (shareLinkError || !shareLink) {
      await supabaseAdmin.from('access_logs').insert({
        user_id: userId,
        share_token: shareToken,
        event_type: 'ACCESS_DENIED',
        user_agent: req.headers.get('user-agent'),
      });
      return new Response(
        JSON.stringify({ error: 'Share link not found', code: 'LINK_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shareLink.is_active) {
      await supabaseAdmin.from('access_logs').insert({
        user_id: userId,
        content_id: shareLink.content_id,
        share_token: shareToken,
        event_type: 'ACCESS_DENIED',
        user_agent: req.headers.get('user-agent'),
      });
      return new Response(
        JSON.stringify({ error: 'This share link has been deactivated', code: 'LINK_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const expiresAt = new Date(shareLink.expires_at);

    if (now > expiresAt) {
      await supabaseAdmin.from('access_logs').insert({
        user_id: userId,
        content_id: shareLink.content_id,
        share_token: shareToken,
        event_type: 'LINK_EXPIRED',
        user_agent: req.headers.get('user-agent'),
      });
      return new Response(
        JSON.stringify({
          error: 'This share link has expired. Please ask the content owner to generate a new link.',
          code: 'LINK_EXPIRED',
          expiredAt: shareLink.expires_at,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedEmails = shareLink.allowed_emails.map((e: string) => e.toLowerCase().trim());

    if (!allowedEmails.includes(userEmail)) {
      await supabaseAdmin.from('access_logs').insert({
        user_id: userId,
        content_id: shareLink.content_id,
        share_token: shareToken,
        event_type: 'ACCESS_DENIED',
        user_agent: req.headers.get('user-agent'),
      });
      return new Response(
        JSON.stringify({
          error: 'You are not authorized to access this content. Your email is not in the allowed list.',
          code: 'EMAIL_NOT_ALLOWED',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: content, error: contentError } = await supabaseAdmin
      .from('contents')
      .select('*')
      .eq('id', shareLink.content_id)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('content')
      .createSignedUrl(content.file_path, 120);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate access URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin.from('access_logs').insert({
      user_id: userId,
      content_id: content.id,
      share_token: shareToken,
      event_type: 'ACCESS_GRANTED',
      user_agent: req.headers.get('user-agent'),
    });

    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / 60000);

    return new Response(
      JSON.stringify({
        title: content.title,
        description: content.description,
        fileType: content.file_type,
        contentCategory: content.content_category,
        mimeType: content.mime_type,
        fileExtension: content.file_extension,
        signedUrl: signedUrlData.signedUrl,
        expiresIn: 120,
        linkExpiresAt: shareLink.expires_at,
        linkRemainingMinutes: remainingMinutes,
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
