export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'
export type TopicStatus = 'pending' | 'approved' | 'rejected'
export type TopicType = 'discussion' | 'announcement'
export type NotificationType =
  | 'topic_approved'
  | 'topic_rejected'
  | 'user_approved'
  | 'reply_received'
  | 'reply_to_post'
  | 'mention_received'
  | 'announcement_posted'
  | 'topic_pending'
  | 'user_pending'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  status: UserStatus
  role: UserRole
  eight_a_url: string | null
  topo_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  created_at: string
}

export interface Sector {
  id: string
  name: string
  description: string | null
  order_index: number
}

export interface Topic {
  id: string
  title: string
  content: string
  author_id: string
  sector_id: string | null
  tag: string | null
  type: TopicType
  status: TopicStatus
  is_pinned: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  topic_id: string
  author_id: string
  content: string
  parent_post_id: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Image {
  id: string
  uploader_id: string
  cloudinary_url: string
  cloudinary_id: string
  topic_id: string | null
  post_id: string | null
  created_at: string
}

export interface Page {
  slug: string
  title: string
  content: string
  updated_by: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface Poll {
  id: string
  topic_id: string | null
  post_id: string | null
  question: string
  created_at: string
}

export interface PollVote {
  id: string
  poll_id: string
  user_id: string
  grade: string
  created_at: string
}

export interface TopicRead {
  user_id: string
  topic_id: string
  last_read_at: string
}

// Query result types (with joins)
export interface TopicWithMeta extends Topic {
  author: Pick<Profile, 'username' | 'avatar_url'> | null
  sector: Pick<Sector, 'name'> | null
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, 'username' | 'avatar_url'> | null
}
