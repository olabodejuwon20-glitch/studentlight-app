import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCircle2, Pencil, Phone, MapPin, Cake, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool, ROLE_META } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";

export function ProfileCard() {
  const { user, school, activeRole, displayName, memberships } = useSchool();
  const [profile, setProfile] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const m = school && activeRole ? memberships.find(x => x.school_id === school.id && x.role === activeRole) : null;
  const data = (m as any)?.profile_data || {};

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone,dob,gender,address,photo_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setLoaded(true); });
  }, [user, m?.bio_completed]);

  if (!activeRole) return null;
  const completed = m?.bio_completed;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="size-14 rounded-xl grid place-items-center text-white shrink-0 overflow-hidden" style={{ background: ROLE_META[activeRole].color }}>
          {profile?.photo_url
            ? <img src={profile.photo_url} alt={displayName} className="size-full object-cover" />
            : <UserCircle2 className="size-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold truncate">{displayName || "Your profile"}</h3>
            <span className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-muted">{activeRole}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{school?.name}</p>
        </div>
        <Button asChild size="sm" variant="outline"><Link to={`/bio?school=${school?.slug ?? ""}`}><Pencil className="size-3.5" /> Edit</Link></Button>
      </div>

      {!loaded ? null : !completed ? (
        <div className="mt-4">
          <EmptyState icon={BadgeCheck} title="Complete your profile" desc="Add your details so your school can identify you." />
        </div>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {profile?.phone && <Row icon={Phone} label="Phone" value={profile.phone} />}
          {profile?.dob && <Row icon={Cake} label="DOB" value={new Date(profile.dob).toLocaleDateString()} />}
          {profile?.address && <Row icon={MapPin} label="Address" value={profile.address} />}
          {profile?.gender && <Row label="Gender" value={profile.gender} />}
          {activeRole === "student" && data.grade_level && <Row label="Class" value={data.grade_level} />}
          {activeRole === "student" && data.parent_contact && <Row label="Parent contact" value={data.parent_contact} />}
          {activeRole === "teacher" && Array.isArray(data.subjects) && data.subjects.length > 0 && <Row label="Subjects" value={data.subjects.join(", ")} />}
          {activeRole === "teacher" && data.qualifications && <Row label="Qualifications" value={data.qualifications} />}
          {activeRole === "parent" && data.occupation && <Row label="Occupation" value={data.occupation} />}
          {activeRole === "parent" && Array.isArray(data.children_names) && data.children_names.length > 0 && <Row label="Children" value={data.children_names.join(", ")} />}
        </div>
      )}
    </Card>
  );
}

function Row({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      {Icon && <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate">{value}</div>
      </div>
    </div>
  );
}
