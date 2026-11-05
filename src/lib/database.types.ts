export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileKind = Database["public"]["Enums"]["profile_kind"]
export type ProfileStatus = Database["public"]["Enums"]["profile_status"]
export type FriendStatus = Database["public"]["Enums"]["friend_status"]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: unknown | null
          heading: string | null
          id: string
          metadata: Json
          source_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: unknown | null
          heading?: string | null
          id?: string
          metadata?: Json
          source_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: unknown | null
          heading?: string | null
          id?: string
          metadata?: Json
          source_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_indexed_at: string | null
          metadata: Json
          source_url: string | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          last_indexed_at?: string | null
          metadata?: Json
          source_url?: string | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_indexed_at?: string | null
          metadata?: Json
          source_url?: string | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_search_documents: {
        Row: {
          author_id: string | null
          connector_profile_id: string | null
          content: string
          embedding: unknown | null
          embedding_model: string | null
          href: string
          id: string
          indexed_at: string
          languages: string[]
          metadata: Json
          neighborhood: string | null
          parent_id: string | null
          profile_kind: string | null
          search_document: unknown
          source_id: string
          source_type: string
          source_updated_at: string
          title: string
          topics: string[]
          visibility: string
        }
        Insert: {
          author_id?: string | null
          connector_profile_id?: string | null
          content: string
          embedding?: unknown | null
          embedding_model?: string | null
          href: string
          id?: string
          indexed_at?: string
          languages?: string[]
          metadata?: Json
          neighborhood?: string | null
          parent_id?: string | null
          profile_kind?: string | null
          search_document?: unknown
          source_id: string
          source_type: string
          source_updated_at?: string
          title: string
          topics?: string[]
          visibility?: string
        }
        Update: {
          author_id?: string | null
          connector_profile_id?: string | null
          content?: string
          embedding?: unknown | null
          embedding_model?: string | null
          href?: string
          id?: string
          indexed_at?: string
          languages?: string[]
          metadata?: Json
          neighborhood?: string | null
          parent_id?: string | null
          profile_kind?: string | null
          search_document?: unknown
          source_id?: string
          source_type?: string
          source_updated_at?: string
          title?: string
          topics?: string[]
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_search_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_search_documents_connector_profile_id_fkey"
            columns: ["connector_profile_id"]
            isOneToOne: false
            referencedRelation: "connector_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_search_index_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          content_hash: string
          created_at: string
          document_id: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          content_hash: string
          created_at?: string
          document_id: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          content_hash?: string
          created_at?: string
          document_id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_search_index_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "platform_search_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          feedback_value: number | null
          id: string
          intent: Json
          latency_ms: number | null
          query_fingerprint: string
          query_text: string
          result_count: number | null
          selected_connector_id: string | null
          unable_to_verify: boolean | null
          used_ai: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          feedback_value?: number | null
          id?: string
          intent?: Json
          latency_ms?: number | null
          query_fingerprint: string
          query_text: string
          result_count?: number | null
          selected_connector_id?: string | null
          unable_to_verify?: boolean | null
          used_ai?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          feedback_value?: number | null
          id?: string
          intent?: Json
          latency_ms?: number | null
          query_fingerprint?: string
          query_text?: string
          result_count?: number | null
          selected_connector_id?: string | null
          unable_to_verify?: boolean | null
          used_ai?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_analytics_events_selected_connector_id_fkey"
            columns: ["selected_connector_id"]
            isOneToOne: false
            referencedRelation: "connector_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_profiles: {
        Row: {
          availability: string[]
          avatar_key: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          headline: string | null
          id: string
          kind: Database["public"]["Enums"]["profile_kind"]
          languages: string[]
          name: string
          neighborhood: string | null
          organization_name: string | null
          owner_id: string | null
          phone: string | null
          preferred_contact_method: string | null
          search_document: unknown
          skills: string[]
          status: Database["public"]["Enums"]["profile_status"]
          topics: string[]
          trust_badges: string[]
          updated_at: string
          website_url: string | null
          years_connected: string | null
          zip_code: string | null
        }
        Insert: {
          availability?: string[]
          avatar_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          headline?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["profile_kind"]
          languages?: string[]
          name: string
          neighborhood?: string | null
          organization_name?: string | null
          owner_id?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          search_document?: unknown
          skills?: string[]
          status?: Database["public"]["Enums"]["profile_status"]
          topics?: string[]
          trust_badges?: string[]
          updated_at?: string
          website_url?: string | null
          years_connected?: string | null
          zip_code?: string | null
        }
        Update: {
          availability?: string[]
          avatar_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          headline?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["profile_kind"]
          languages?: string[]
          name?: string
          neighborhood?: string | null
          organization_name?: string | null
          owner_id?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          search_document?: unknown
          skills?: string[]
          status?: Database["public"]["Enums"]["profile_status"]
          topics?: string[]
          trust_badges?: string[]
          updated_at?: string
          website_url?: string | null
          years_connected?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_profiles: {
        Row: {
          connector_profile_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          connector_profile_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          connector_profile_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_profiles_connector_profile_id_fkey"
            columns: ["connector_profile_id"]
            isOneToOne: false
            referencedRelation: "connector_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_places: {
        Row: {
          created_at: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          image_urls: string[]
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          image_urls?: string[]
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_subscriptions: {
        Row: {
          created_at: string
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_subscriptions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_post_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_mentions: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          mentioned_user_id: string
          post_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id: string
          post_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_mentions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          member_one_id: string
          member_two_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_one_id: string
          member_two_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_one_id?: string
          member_two_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversations_member_one_id_fkey"
            columns: ["member_one_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_member_two_id_fkey"
            columns: ["member_two_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversation_preferences: {
        Row: {
          archived_at: string
          conversation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string
          conversation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string
          conversation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversation_preferences_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          delivered_at: string
          id: string
          is_forwarded: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          delivered_at?: string
          id?: string
          is_forwarded?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string
          id?: string
          is_forwarded?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          requester_id: string
          status: Database["public"]["Enums"]["friend_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_recommendations: {
        Row: {
          connector_profile_id: string
          created_at: string
          id: string
          note: string | null
          recommender_id: string
        }
        Insert: {
          connector_profile_id: string
          created_at?: string
          id?: string
          note?: string | null
          recommender_id: string
        }
        Update: {
          connector_profile_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recommender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_recommendations_connector_profile_id_fkey"
            columns: ["connector_profile_id"]
            isOneToOne: false
            referencedRelation: "connector_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_safety_controls: {
        Row: {
          actor_id: string
          blocked_at: string | null
          created_at: string
          muted_at: string | null
          target_id: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          blocked_at?: string | null
          created_at?: string
          muted_at?: string | null
          target_id: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          blocked_at?: string | null
          created_at?: string
          muted_at?: string | null
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_safety_controls_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_safety_controls_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string
          email_sent_at: string | null
          group_key: string
          href: string
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          source_id: string
          source_kind: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          email_sent_at?: string | null
          group_key?: string
          href?: string
          id?: string
          kind: string
          read_at?: string | null
          recipient_id: string
          source_id: string
          source_kind: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          email_sent_at?: string | null
          group_key?: string
          href?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          source_id?: string
          source_kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          contact_visibility: string
          connection_requests: boolean
          direct_messages: boolean
          email_digest_frequency: string
          email_notifications: boolean
          forum_replies: boolean
          last_email_digest_at: string | null
          message_permission: string
          notifications_read_at: string | null
          profile_visibility: string
          recommendations: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_visibility?: string
          connection_requests?: boolean
          direct_messages?: boolean
          email_digest_frequency?: string
          email_notifications?: boolean
          forum_replies?: boolean
          last_email_digest_at?: string | null
          message_permission?: string
          notifications_read_at?: string | null
          profile_visibility?: string
          recommendations?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_visibility?: string
          connection_requests?: boolean
          direct_messages?: boolean
          email_digest_frequency?: string
          email_notifications?: boolean
          forum_replies?: boolean
          last_email_digest_at?: string | null
          message_permission?: string
          notifications_read_at?: string | null
          profile_visibility?: string
          recommendations?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_member_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_member_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_export_data: {
        Args: { export_kind: string }
        Returns: Json
      }
      admin_set_account_status: {
        Args: { next_status: string; target_user_id: string }
        Returns: undefined
      }
      can_view_member_profile: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      find_member: {
        Args: { search_term: string }
        Returns: {
          display_name: string
          member_id: string
        }[]
      }
      claim_platform_search_index_jobs: {
        Args: { requested_count?: number }
        Returns: {
          attempt_count: number
          content: string
          content_hash: string
          document_id: string
          languages: string[]
          neighborhood: string | null
          title: string
          topics: string[]
        }[]
      }
      complete_platform_search_index_job: {
        Args: {
          document_embedding: string
          embedding_model_name: string
          expected_content_hash: string
          target_document_id: string
        }
        Returns: boolean
      }
      fail_platform_search_index_job: {
        Args: {
          error_detail: string
          expected_content_hash: string
          target_document_id: string
        }
        Returns: string | null
      }
      get_search_operations_summary: {
        Args: { lookback_days?: number }
        Returns: Json
      }
      get_profile_social_context: {
        Args: { target_connector_profile_id: string }
        Returns: Json
      }
      get_hidden_member_ids: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_blocked: boolean
          is_muted: boolean
          member_id: string
        }[]
      }
      get_member_privacy: {
        Args: { target_user_id: string }
        Returns: Json
      }
      is_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      start_direct_conversation: {
        Args: { other_member_id: string }
        Returns: string
      }
      mark_direct_conversation_read: {
        Args: { target_conversation_id: string }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_notification_read: {
        Args: {
          should_be_read: boolean
          target_notification_ids: string[]
        }
        Returns: number
      }
      members_are_connected: {
        Args: { first_user_id: string; second_user_id: string }
        Returns: boolean
      }
      set_own_account_status: {
        Args: { next_status: string }
        Returns: undefined
      }
      set_member_block: {
        Args: { should_block: boolean; target_user_id: string }
        Returns: undefined
      }
      set_member_mute: {
        Args: { should_mute: boolean; target_user_id: string }
        Returns: undefined
      }
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          heading: string | null
          similarity: number
          source_id: string
          source_kind: string
          source_title: string
          source_url: string | null
          storage_path: string | null
        }[]
      }
      refresh_platform_search_documents: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      requeue_failed_platform_search_index_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      search_platform_documents: {
        Args: {
          language_filters?: string[] | null
          match_count?: number
          neighborhood_filters?: string[] | null
          profile_type_filter?: string | null
          query_embedding?: string | null
          query_text: string
          source_types?: string[] | null
          topic_filters?: string[] | null
        }
        Returns: {
          author_id: string | null
          connector_profile_id: string | null
          content: string
          document_id: string
          href: string
          languages: string[]
          lexical_score: number
          metadata: Json
          neighborhood: string | null
          parent_id: string | null
          profile_kind: string | null
          score: number
          semantic_score: number
          source_id: string
          source_type: string
          title: string
          topics: string[]
        }[]
      }
    }
    Enums: {
      friend_status: "pending" | "accepted" | "blocked"
      profile_kind: "person" | "vendor" | "organization"
      profile_status:
        | "draft"
        | "pending_review"
        | "published"
        | "rejected"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      friend_status: ["pending", "accepted", "blocked"],
      profile_kind: ["person", "vendor", "organization"],
      profile_status: [
        "draft",
        "pending_review",
        "published",
        "rejected",
        "archived",
      ],
    },
  },
} as const
