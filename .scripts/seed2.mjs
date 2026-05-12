import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const url = "https://fiigsvxlxaqyzcvykkvw.supabase.co";
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = JSON.parse(readFileSync("/tmp/seed-ids.json", "utf8"));
const SCHOOL = "0df0fdf1-44bd-4af3-a596-cda7aebea313";
const ADMIN  = "d2ba2a05-1b33-4295-95cc-dd4ee104eba9";

// 1. profiles
const profileRows = [
  ...ids.teachers.map(t => ({ id: t.id, full_name: t.name, email: t.email, gender: t.name.startsWith("Mrs.") || t.name.startsWith("Ms.") ? "female" : "male" })),
  ...ids.students.map((s,i) => ({ id: s.id, full_name: s.name, email: s.email, gender: i%2===0 ? "female" : "male", dob: `200${8+(i%2)}-0${(i%9)+1}-1${i%9}` })),
  ...ids.parents.map(p => ({ id: p.id, full_name: p.name, email: p.email })),
];
let r = await sb.from("profiles").upsert(profileRows, { onConflict: "id" });
console.log("profiles", r.error?.message || "ok");

// 2. memberships
const memb = [
  ...ids.teachers.map(t => ({ school_id: SCHOOL, user_id: t.id, role: "teacher", status: "active", bio_completed: true, profile_data: { subject: t.subj } })),
  ...ids.students.map(s => ({ school_id: SCHOOL, user_id: s.id, role: "student", status: "active", bio_completed: true })),
  ...ids.parents.map(p  => ({ school_id: SCHOOL, user_id: p.id, role: "parent",  status: "active", bio_completed: true })),
];
r = await sb.from("memberships").insert(memb);
console.log("memberships", r.error?.message || "ok");

// 3. update existing classes to set teacher_id
const { data: cls } = await sb.from("classes").select("id,name").eq("school_id", SCHOOL).order("created_at");
for (let i=0; i<cls.length; i++) {
  await sb.from("classes").update({ teacher_id: ids.teachers[i % ids.teachers.length].id }).eq("id", cls[i].id);
}
console.log("classes updated", cls.length);

// 4. enrollments: distribute students across classes
const enrolls = ids.students.map((s,i) => ({ school_id: SCHOOL, class_id: cls[i % cls.length].id, student_id: s.id }));
r = await sb.from("class_enrollments").insert(enrolls);
console.log("enrollments", r.error?.message || "ok");

// 5. parent_links: each parent gets ~3 children
const links = [];
ids.students.forEach((s,i) => links.push({ school_id: SCHOOL, parent_user_id: ids.parents[i % ids.parents.length].id, student_user_id: s.id }));
r = await sb.from("parent_links").insert(links);
console.log("parent_links", r.error?.message || "ok");

// 6. results
const subjects = ["Mathematics","English Language","Biology","Chemistry","Physics","Civic Education","Economics","Geography","Agricultural Sci"];
function necoGrade(s){ if(s>=75)return"A1";if(s>=70)return"B2";if(s>=65)return"B3";if(s>=60)return"C4";if(s>=55)return"C5";if(s>=50)return"C6";if(s>=45)return"D7";if(s>=40)return"E8";return"F9"; }
const results = [];
ids.students.forEach((s,si) => {
  subjects.forEach((subj,sj) => {
    const base = 50 + ((si*7 + subj.length*3) % 45);
    const score = Math.max(35, Math.min(95, base + ((si+sj)%8) - 4));
    const tch = ids.teachers[sj % ids.teachers.length];
    results.push({ school_id: SCHOOL, student_id: s.id, teacher_id: tch.id, subject: subj, score, grade: necoGrade(score), term: "Term 1", remarks: (si+sj)%3===0 ? "Excellent effort" : (si+sj)%3===1 ? "Keep it up" : "Needs improvement" });
  });
});
r = await sb.from("results").insert(results);
console.log("results", r.error?.message || `ok ${results.length}`);

// 7. attendance: last 10 weekdays
const att = [];
const today = new Date();
const cls0 = cls[0].id;
for (let i=0;i<14;i++) {
  const d = new Date(today); d.setDate(today.getDate()-i);
  if (d.getDay()===0 || d.getDay()===6) continue;
  ids.students.forEach((s,si) => {
    const status = ((si+i)%11===0) ? "absent" : ((si+i)%7===0) ? "late" : "present";
    att.push({ school_id: SCHOOL, student_id: s.id, class_id: cls0, status, date: d.toISOString().slice(0,10), marked_by: ids.teachers[0].id });
  });
}
r = await sb.from("attendance").insert(att);
console.log("attendance", r.error?.message || `ok ${att.length}`);

// 8. fees
const fees = ids.students.map((s,i) => ({ school_id: SCHOOL, student_id: s.id, description: "Term 1 Tuition", amount: 75000, status: i%3===1 ? "paid" : "pending", due_date: new Date(Date.now()+14*86400000).toISOString().slice(0,10) }));
r = await sb.from("fees").insert(fees);
console.log("fees", r.error?.message || "ok");

// 9. exams (fix created_by)
const exams = [
  { school_id: SCHOOL, class_id: cls[0].id, title: "Mid-Term Mathematics Test", subject: "Mathematics", scheduled_at: new Date(Date.now()+3*86400000).toISOString(), duration_minutes: 60, status: "scheduled", created_by: ids.teachers[0].id, proctored: true, randomize: true },
  { school_id: SCHOOL, class_id: cls[1]?.id || cls[0].id, title: "English Language CBT", subject: "English Language", scheduled_at: new Date(Date.now()+7*86400000).toISOString(), duration_minutes: 90, status: "scheduled", created_by: ids.teachers[1].id, proctored: true, randomize: false },
  { school_id: SCHOOL, class_id: cls[2]?.id || cls[0].id, title: "Biology Practical Mock", subject: "Biology", scheduled_at: new Date(Date.now()+10*86400000).toISOString(), duration_minutes: 120, status: "scheduled", created_by: ids.teachers[2].id, proctored: false, randomize: false },
];
r = await sb.from("exams").insert(exams);
console.log("exams", r.error?.message || "ok");

// 10. Fix timetable teacher_ids
const { data: tt } = await sb.from("timetable").select("id").eq("school_id", SCHOOL);
for (let i=0;i<tt.length;i++) {
  await sb.from("timetable").update({ teacher_id: ids.teachers[i % ids.teachers.length].id }).eq("id", tt[i].id);
}
console.log("timetable updated", tt.length);

// 11. some messages from teachers to admin
const msgs = ids.teachers.slice(0,2).map(t => ({ school_id: SCHOOL, sender_id: t.id, recipient_id: ADMIN, body: `Hello admin, requesting approval for ${t.subj} test materials.` }));
r = await sb.from("messages").insert(msgs);
console.log("messages", r.error?.message || "ok");

console.log("DONE");
