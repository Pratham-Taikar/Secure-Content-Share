import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map of allowed MIME types to category and folder
const ALLOWED_TYPES: Record<string, { category: string; folder: string }> = {
  // Video
  'video/mp4': { category: 'video', folder: 'videos' },
  'video/webm': { category: 'video', folder: 'videos' },
  'video/quicktime': { category: 'video', folder: 'videos' },
  // Audio
  'audio/mpeg': { category: 'audio', folder: 'audios' },
  'audio/wav': { category: 'audio', folder: 'audios' },
  'audio/x-wav': { category: 'audio', folder: 'audios' },
  'audio/x-m4a': { category: 'audio', folder: 'audios' },
  'audio/mp4': { category: 'audio', folder: 'audios' },
  // Image
  'image/jpeg': { category: 'image', folder: 'images' },
  'image/png': { category: 'image', folder: 'images' },
  'image/webp': { category: 'image', folder: 'images' },
  'image/gif': { category: 'image', folder: 'images' },
  // Document
  'application/pdf': { category: 'document', folder: 'docs' },
  'application/msword': { category: 'document', folder: 'docs' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', folder: 'docs' },
  'application/vnd.ms-powerpoint': { category: 'document', folder: 'docs' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'document', folder: 'docs' },
  'text/plain': { category: 'document', folder: 'docs' },
};

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
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
    const { title, description, fileName, mimeType, sizeBytes } = await req.json();

    if (!title || !fileName || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, fileName, mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typeInfo = ALLOWED_TYPES[mimeType];
    if (!typeInfo) {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${mimeType}. Allowed: video, audio, image, pdf, doc, ppt, txt` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileExtension = getFileExtension(fileName);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${sanitizedFileName}`;
    const filePath = `${userId}/${typeInfo.folder}/${uniqueFileName}`;

    // Determine file_type for backwards compatibility (maps to the enum)
    let fileType: string;
    if (typeInfo.category === 'video') fileType = 'video';
    else fileType = 'pdf'; // Use 'pdf' as fallback for enum compatibility

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('content')
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      console.error('Upload URL error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to create upload URL', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: contentData, error: contentError } = await supabaseAdmin
      .from('contents')
      .insert({
        owner_id: userId,
        title,
        description: description || null,
        file_type: fileType,
        content_category: typeInfo.category,
        file_extension: fileExtension,
        file_path: filePath,
        mime_type: mimeType,
        size_bytes: sizeBytes || null,
      })
      .select('id')
      .single();

    if (contentError) {
      console.error('Content insert error:', contentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create content record', details: contentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin.from('access_logs').insert({
      user_id: userId,
      content_id: contentData.id,
      event_type: 'UPLOAD',
      user_agent: req.headers.get('user-agent'),
    });

    return new Response(
      JSON.stringify({
        uploadUrl: uploadData.signedUrl,
        uploadToken: uploadData.token,
        contentId: contentData.id,
        filePath,
        contentCategory: typeInfo.category,
        message: 'Upload URL generated successfully',
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
