update storage.buckets
set
  public = true,
  file_size_limit = 157286400,
  allowed_mime_types = array['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
where id = 'product-models';
