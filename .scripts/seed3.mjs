import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const sb = createClient("https://fiigsvxlxaqyzcvykkvw.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = JSON.parse(readFileSync("/tmp/seed-ids.json", "utf8"));
const SCHOOL = "0df0fdf1-44bd-4af3-a596-cda7aebea313";
const memb = [
  ...ids.teachers.map(t => ({ school_id: SCHOOL, user_id: t.id, role: "teacher", status: "active", bio_completed: true, profile_data: { subject: t.subj } })),
  ...ids.students.map(s => ({ school_id: SCHOOL, user_id: s.id, role: "student", status: "active", bio_completed: true, profile_data: {} })),
  ...ids.parents.map(p  => ({ school_id: SCHOOL, user_id: p.id, role: "parent",  status: "active", bio_completed: true, profile_data: {} })),
];
const r = await sb.from("memberships").insert(memb);
console.log("memberships", r.error?.message || "ok");
