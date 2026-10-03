import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowUpRight, Camera, CheckCircle2, History, Leaf, MapPin, MessageCircle, Phone, ShieldCheck, Sprout } from "lucide-react";
import type { User } from "firebase/auth";
import { PHASE2_CONSENT_VERSION, type Phase2State, type ProfileInput } from "../../shared/domain";
import type { Copy } from "../lib/i18n";
import { demo, request } from "../lib/api";
import { loadPhase2, persistDemoPhase2, phase2Post } from "../lib/phase2";
import { LocationFields } from "./LocationFields";

type DashboardPage = "advisor" | "records" | "community";
type Props = {
  copy: Copy;
  locale: string;
  user: User | null;
  onNavigate: (page: DashboardPage) => void;
  onError: (message: string) => void;
};

const emptyState: Phase2State = { plots: [], cycles: [], events: [], ledger: [], cases: [], outcomes: [] };

export function FarmerDashboard({ copy: t, locale, user, onNavigate, onError }: Props) {
  const [state, setState] = useState<Phase2State>(emptyState);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({ displayName: "", state: "", district: "" });
  const [phoneStatus, setPhoneStatus] = useState<{ configured: boolean; verified: boolean; last4: string | null }>({ configured: false, verified: false, last4: null });
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPhase2()
      .then((value) => {
        if (cancelled) return;
        setState(value);
        setProfile({
          displayName: value.profile?.displayName || user?.displayName || "",
          state: value.profile?.state || "",
          district: value.profile?.district || "",
        });
        setEditing(!value.profile);
        setLoaded(true);
      })
      .catch((error) => onError(error instanceof Error ? error.message : t.error));
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (demo || !user || user.isAnonymous) return;
    request<{ configured: boolean; verified: boolean; last4: string | null }>("phone/status")
      .then(setPhoneStatus)
      .catch(() => setPhoneStatus({ configured: false, verified: false, last4: null }));
  }, [user?.uid]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3_000_000) {
      onError(t.profilePhotoError);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const value = {
        displayName: profile.displayName,
        state: profile.state,
        district: profile.district,
        locale,
        recentCropCode: state.profile?.recentCropCode || "",
        lastHarvestOn: state.profile?.lastHarvestOn || "",
        consentVersion: PHASE2_CONSENT_VERSION,
      } satisfies ProfileInput;
      if (demo) {
        const now = Date.now();
        const next = { ...state, profile: { ...value, createdAt: state.profile?.createdAt ?? now, updatedAt: now } };
        await persistDemoPhase2(next);
        setState(next);
      } else {
        await phase2Post("profile", value);
        setState(await loadPhase2());
      }
      setEditing(false);
      setSaved(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    try {
      await request("phone/send", { phone });
      setOtpSent(true);
      setSaved(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    try {
      const result = await request<{ verified: boolean; last4: string; verifiedAt: number }>("phone/check", { phone, code: otp });
      setPhoneStatus({ configured: true, verified: result.verified, last4: result.last4 });
      setOtp("");
      setOtpSent(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  const avatar = photoPreview || user?.photoURL || "";
  const activeCycles = state.cycles.filter((cycle) => cycle.status === "active").length;
  const openCases = state.cases.filter((item) => item.status !== "closed").length;
  const displayName = state.profile?.displayName || user?.displayName || t.farmerFallbackName;

  if (!loaded) return <section className="dashboard-page section"><p>{t.loadingRecords}</p></section>;

  return (
    <section className="dashboard-page section" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">{t.farmerDashboard}</p>
          <h1 id="dashboard-title">{t.dashboardWelcome.replace("{name}", displayName)}</h1>
          <p>{t.dashboardCopy}</p>
        </div>
        <span className="dashboard-season"><Leaf size={18} />{t.dashboardSeason}</span>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card profile-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" aria-label={t.profilePhoto}>
              {avatar ? <img src={avatar} alt={t.profilePhotoAlt} /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}
            </div>
            <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={choosePhoto} />
            <button className="avatar-action" type="button" onClick={() => inputRef.current?.click()}><Camera size={15} />{t.changePhoto}</button>
          </div>
          <div className="profile-summary">
            <div className="card-label"><ShieldCheck size={15} />{t.profileTitle}</div>
            <h2>{displayName}</h2>
            <p>{user?.email || t.googleAccount}</p>
            {state.profile && <p className="profile-location"><MapPin size={15} />{state.profile.district}, {state.profile.state}</p>}
            <small>{t.sessionPhotoNotice}</small>
          </div>
          <button className="dashboard-link" onClick={() => setEditing((value) => !value)}>{editing ? t.cancel : t.editProfile}<ArrowUpRight size={16} /></button>
        </article>

        <article className="dashboard-card account-card">
          <div className="card-label"><CheckCircle2 size={15} />{t.accountStatus}</div>
          <h2>{t.googleSignedIn}</h2>
          <p>{t.googleRecordAccess}</p>
          <div className={phoneStatus.verified ? "account-pill linked" : "account-pill"}><Phone size={14} />{phoneStatus.verified ? t.phoneVerifiedEnding.replace("{last4}", phoneStatus.last4 || "") : t.phoneOptional}</div>
          <small>{phoneStatus.verified ? t.phonePrivacy : t.phoneOptionalCopy}</small>
          {!phoneStatus.verified && phoneStatus.configured && (
            <div className="phone-verification">
              <strong>{t.phoneVerifyAction}</strong>
              <p>{t.phoneVerifyWhy}</p>
              <label>{t.phoneEnter}<input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\s/g, ""))} /></label>
              {otpSent && <><p className="phone-sent" role="status">{t.phoneCodeSent}</p><label>{t.phoneOtp}<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} /></label></>}
              <button type="button" disabled={busy || (otpSent ? otp.length < 4 : !/^\+91[6-9]\d{9}$/.test(phone))} onClick={() => void (otpSent ? verifyOtp() : sendOtp())}>{otpSent ? t.phoneConfirmOtp : t.phoneSendOtp}</button>
              <small>{t.phonePrivacy}</small>
            </div>
          )}
          {!phoneStatus.verified && !phoneStatus.configured && <p className="phone-unavailable">{t.phoneVerifyUnavailable}</p>}
        </article>

        {editing && (
          <article className="dashboard-card profile-editor">
            <div><p className="card-label">{t.profileDetails}</p><h2>{state.profile ? t.updateProfile : t.completeProfile}</h2><p>{t.profileDashboardCopy}</p></div>
            <form onSubmit={saveProfile}>
              <label>{t.farmerName}<input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
              <LocationFields copy={t} state={profile.state} district={profile.district} onChange={(location) => setProfile({ ...profile, ...location })} />
              <button className="primary" disabled={busy}>{busy ? t.working : t.saveProfile}</button>
            </form>
          </article>
        )}
        {saved && <p className="dashboard-saved" role="status"><CheckCircle2 size={16} />{t.profileSaved}</p>}

        <article className="dashboard-card metric-card"><Sprout /><strong>{state.plots.length}</strong><span>{t.dashboardPlots}</span></article>
        <article className="dashboard-card metric-card"><History /><strong>{activeCycles}</strong><span>{t.dashboardCycles}</span></article>
        <article className="dashboard-card metric-card"><ShieldCheck /><strong>{openCases}</strong><span>{t.dashboardCases}</span></article>

        <article className="dashboard-card quick-actions">
          <div><p className="card-label">{t.quickActions}</p><h2>{t.dashboardNext}</h2></div>
          <div className="dashboard-actions">
            <button onClick={() => onNavigate("advisor")}><MessageCircle /><span><strong>{t.advisor}</strong><small>{t.dashboardAdvisorCopy}</small></span><ArrowUpRight /></button>
            <button onClick={() => onNavigate("records")}><History /><span><strong>{t.records}</strong><small>{t.dashboardRecordsCopy}</small></span><ArrowUpRight /></button>
            <button onClick={() => onNavigate("community")}><Sprout /><span><strong>{t.community}</strong><small>{t.dashboardCommunityCopy}</small></span><ArrowUpRight /></button>
          </div>
        </article>
      </div>
    </section>
  );
}
