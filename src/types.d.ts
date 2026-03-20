declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email?: string;
    } | null;
    currentUser?: {
      id: string;
      email: string;
      created_at: string;
      session_id: string;
    } | null;
    requestId?: string;
  }
}
