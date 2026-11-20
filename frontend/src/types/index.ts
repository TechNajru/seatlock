export type Role = "ADMIN" | "ORGANIZER" | "STUDENT";
export interface User { id: string; email: string; name: string; role: Role; created_at?: string }
export interface EventItem {
  id: string; title: string; description: string; venue: string; start_time: string;
  status: "DRAFT" | "PUBLISHED"; version: number; organizer_name?: string;
  total_seats?: number; available_seats?: number;
}
export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
export interface Seat { id: string; label: string; row_label: string; seat_number: number; status: SeatStatus; mine: boolean }
export interface MyHold { id: string; expires_at: string; seconds_left: number }
export interface SeatMapData { event: EventItem; seats: Seat[]; my_hold: MyHold | null }
export interface Booking { id: string; status: "CONFIRMED" | "CANCELLED"; checked_in_at: string | null; created_at: string;
  event_id: string; title: string; venue: string; start_time: string; seats: string[] }
export interface Attendee { id: string; status: string; checked_in_at: string | null; student_name: string; student_email: string; seats: string[] }
export interface AuditItem { id: string; actor_id: string | null; event_id: string | null; action: string; details: Record<string, unknown>; created_at: string; shard: number }
export interface AuditPage { items: AuditItem[]; next_cursor: string | null; shards_queried: number[] }
