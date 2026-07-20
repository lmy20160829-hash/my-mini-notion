"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, LogOut, Mail } from "lucide-react";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import {
  INTRODUCTION_MAX_LENGTH,
  fetchIntroduction,
  saveIntroduction,
} from "@/lib/profile-sync";
import { uploadProfileImage } from "@/lib/profile-image";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function MyPage() {
  const app = useApp();
  const auth = useAuth();
  const profile = useProfile();
  const [nickDraft, setNickDraft] = useState("");
  const [introDraft, setIntroDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = auth.user?.id ?? null;

  // Fill the draft once profile data is loaded.
  useEffect(() => {
    if (app.loaded) setNickDraft(profile.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.loaded]);

  // 자기소개는 로컬이 아니라 profile 테이블에 있으므로 로그인 사용자가 정해지면 읽어온다.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchIntroduction(userId).then(({ introduction }) => {
      if (!cancelled) setIntroDraft(introduction ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const saveProfile = async () => {
    app.saveNickname(nickDraft);
    // 별명과 한 번의 "변경사항 저장"으로 함께 반영된다(같은 저장 완료 표시를 공유).
    // 자기소개는 서버 저장이므로 결과를 기다린다 — 실패했는데 "저장되었습니다"가 뜨면
    // 사용자는 내용을 잃고도 모른다. 알림 방식은 store 의 오류 처리 관행을 따른다
    // (정적 SPA라 토스트 인프라가 없다 — DESIGN.md §5.5).
    if (userId) {
      const { error } = await saveIntroduction(userId, introDraft);
      if (error) {
        window.alert(error);
        return;
      }
    }
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1800);
  };

  /**
   * 사진은 별명·자기소개와 달리 "변경사항 저장"을 기다리지 않고 고르는 즉시 반영된다
   * (Storage 업로드 → profile.image_path 기록까지 한 번에). 업로드 중에는 버튼을
   * 잠가 같은 사용자가 여러 파일을 겹쳐 올리는 것을 막는다.
   */
  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    // 같은 파일을 다시 골라도 change 가 발생하도록 값을 비운다.
    input.value = "";

    if (!userId) {
      window.alert("로그인이 필요합니다. 다시 로그인해 주세요.");
      return;
    }

    setUploading(true);
    const { imagePath, error } = await uploadProfileImage(
      userId,
      file,
      app.profileImagePath
    );
    setUploading(false);

    if (error) {
      window.alert(error);
      return;
    }
    app.setProfileImagePath(imagePath);
  };

  return (
    <div className="mypage">
      <h1 className="mypage__title">마이 페이지</h1>
      <p className="mypage__subtitle">
        서비스에서 사용할 프로필 정보를 관리하세요.
      </p>

      <div className="mypage-card">
        <div className="mypage-avatar-row">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={72} />
          <div className="mypage-avatar-row__body">
            <div className="mypage-avatar-row__name">프로필 이미지</div>
            <div className="mypage-avatar-row__hint">
              JPG, PNG · 5MB 이하 정사각형 이미지를 권장합니다.
            </div>
            <label className={`upload-btn${uploading ? " is-busy" : ""}`}>
              <ImageIcon size={16} />
              {uploading ? "업로드 중…" : "사진 변경"}
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarPick}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        <div className="mypage-field">
          <label htmlFor="nickname">별명</label>
          <input
            id="nickname"
            className="field-input"
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            placeholder="사용할 별명을 입력하세요"
          />
        </div>

        <div className="mypage-field">
          <label htmlFor="introduction">자기소개</label>
          <textarea
            id="introduction"
            className="field-textarea"
            value={introDraft}
            maxLength={INTRODUCTION_MAX_LENGTH}
            onChange={(e) => setIntroDraft(e.target.value)}
            placeholder="자신을 간단히 소개해 보세요"
          />
        </div>

        <div className="mypage-field mypage-field--email">
          <label>이메일</label>
          <div className="field-readonly">
            <Mail size={16} />
            <span className="field-readonly__value">{profile.email}</span>
            <Badge>Google 계정</Badge>
          </div>
        </div>

        <div className="mypage-card__footer">
          <Button variant="primary" onClick={saveProfile}>
            변경사항 저장
          </Button>
          {saved && (
            <span className="saved-note">
              <Check size={16} />
              저장되었습니다
            </span>
          )}
        </div>
      </div>

      <div className="logout-card">
        <div className="logout-card__body">
          <div className="logout-card__title">로그아웃</div>
          <div className="logout-card__desc">
            이 기기에서 계정을 로그아웃합니다.
          </div>
        </div>
        <Button variant="secondary" iconLeft={LogOut} onClick={auth.signOut}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
