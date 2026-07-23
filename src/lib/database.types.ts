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
      connector_profiles: {
        Row: {
          availability: string[]
          avatar_key: string | null
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
      forum_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          post_id?: string
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
        ]
      }
      forum_posts: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
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
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
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
      find_member: {
        Args: { search_term: string }
        Returns: {
          display_name: string
          member_id: string
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
