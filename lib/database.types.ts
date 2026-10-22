export type Json =
  string | number | boolean | null | { [key: string]: Json } | Json[];

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Endpoint = {
  id: string;
  project_id: string;
  method: string;
  path: string;
  status_code: number;
  response_body: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RequestLog = {
  id: string;
  endpoint_id: string;
  method: string;
  requested_path: string;
  query_params: Json;
  status_code: number;
  duration_ms: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      mock_projects: {
        Row: Project;
        Insert: Pick<Project, "owner_id" | "name" | "slug"> &
          Partial<Omit<Project, "owner_id" | "name" | "slug">>;
        Update: Partial<Project>;
        Relationships: [];
      };
      mock_endpoints: {
        Row: Endpoint;
        Insert: Pick<Endpoint, "project_id" | "method" | "path"> &
          Partial<Omit<Endpoint, "project_id" | "method" | "path">>;
        Update: Partial<Endpoint>;
        Relationships: [
          {
            foreignKeyName: "mock_endpoints_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "mock_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      request_logs: {
        Row: RequestLog;
        Insert: Omit<RequestLog, "id" | "created_at" | "query_params"> &
          Partial<Pick<RequestLog, "id" | "created_at" | "query_params">>;
        Update: Partial<RequestLog>;
        Relationships: [
          {
            foreignKeyName: "request_logs_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "mock_endpoints";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
