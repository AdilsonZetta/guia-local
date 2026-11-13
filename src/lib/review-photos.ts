import { supabase } from './supabase'
/** Keep a submitted review even when an optional photo cannot be uploaded. */
export async function uploadReviewPhotos(
  reviewId: string,
  userId: string,
  photos: File[],
) {
  let failed = false
  for (const [index, file] of photos.entries()) {
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const uploaded = await supabase.storage
      .from('review-photos')
      .upload(path, file)
    if (uploaded.error) {
      failed = true
      continue
    }
    const url = supabase.storage.from('review-photos').getPublicUrl(path)
      .data.publicUrl
    const inserted = await supabase.from('review_photos').insert({
      review_id: reviewId,
      url,
      storage_path: path,
      sort_order: index,
    })
    if (inserted.error) {
      failed = true
      await supabase.storage.from('review-photos').remove([path])
    }
  }
  return failed
}
