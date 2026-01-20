import { useEffect, useMemo, useState } from "react";
import {
  Navbar,
  Avatar,
  HStack,
  Button,
  Tooltip,
  Whisper,
  Dropdown,
  Drawer,
  Input,
  Toggle,
} from "rsuite";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TbLayoutSidebar } from "react-icons/tb";
import { MdOutlineDarkMode } from "react-icons/md";
import { CiLight } from "react-icons/ci";
import { FiEdit2, FiMenu } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { changeTheme } from "../../createSlice/ThemeSlice";
import { changeLanguage } from "../../createSlice/ChangeLanguage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

const LANGS = [
  { code: "en", img: "/flags/en.png" },
  { code: "uz", img: "/flags/uz.png" },
  { code: "ru", img: "/flags/ru.png" },
];

// md breakpoint
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

const Brand = ({ theme, isMobile }) => (
  <Link
    to={"/"}
    style={{
      textDecoration: "none",
      color: theme === "light" ? "#111827" : "#E5E7EB",
      display: "inline-flex",
      alignItems: "center",
      minWidth: 0,
    }}
  >
    <HStack spacing={10} style={{ minWidth: 0 }}>
      <img
        src="/NavLogo1.png"
        alt="Logo"
        style={{
          width: isMobile ? 46 : 75,
          height: "auto",
          transition: "width 200ms ease",
          flex: "0 0 auto",
        }}
      />

      <h3
        style={{
          margin: 0,
          fontWeight: 900,
          color: "#2E3192",
          fontSize: "clamp(14px, 2.2vw, 24px)",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: isMobile ? 160 : 360,
        }}
      >
        HASHIM SCHOOL
      </h3>
    </HStack>
  </Link>
);

function SiteNavbar({ setExpanded }) {
  const theme = useSelector((state) => state.theme.value);
  const lang = useSelector((state) => state.language.value);
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultAvatar = "https://i.pravatar.cc/150?u=19";

  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(defaultAvatar);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loginId, setLoginId] = useState("37363");
  const [password, setPassword] = useState("********");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [editingLogin, setEditingLogin] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingNotifications, setEditingNotifications] = useState(false);

 
  useEffect(() => {
    const el =
      document.getElementById("app-content") || document.getElementById("root");
    if (!el) return;

    if (menuOpen || settingsOpen) el.classList.add("app-blur");
    else el.classList.remove("app-blur");

    return () => el.classList.remove("app-blur");
  }, [menuOpen, settingsOpen]);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("settings.avatar");
    if (savedAvatar && savedAvatar !== "null" && savedAvatar !== "undefined") {
      setAvatarSrc(savedAvatar);
    } else {
      setAvatarSrc(defaultAvatar);
    }
  }, [defaultAvatar]);

  const currentLang = useMemo(
    () => LANGS.find((l) => l.code === lang) || LANGS[0],
    [lang],
  );

  const iconBtnStyle = {
    color: theme === "light" ? "#1F2937" : "#E5E7EB",
    borderRadius: 10,
  };

  const handleSetLang = (code) => {
    if (code) {
      dispatch(changeLanguage(code));
      i18n.changeLanguage(code);
    }
  };

  const Controls = ({ inDrawer = false }) => (
    <HStack
      spacing={8}
      className={inDrawer ? "drawer-controls" : undefined}
      style={{
        alignItems: "center",
        flexWrap: inDrawer ? "nowrap" : "wrap",
        width: inDrawer ? "100%" : "auto",
      }}
    >
      <Whisper
        placement="bottom"
        trigger="hover"
        speaker={<Tooltip>{t("Sidebar")}</Tooltip>}
      >
        <Button
          appearance={inDrawer ? "ghost" : "subtle"}
          onClick={() => {
            setExpanded?.((prev) => !prev);
            if (inDrawer) setMenuOpen(false);
          }}
          style={iconBtnStyle}
        >
          <TbLayoutSidebar size={26} />
        </Button>
      </Whisper>

      <Whisper
        placement="bottom"
        trigger="hover"
        speaker={
          <Tooltip>
            {theme === "light" ? t("Dark mode") : t("Light mode")}
          </Tooltip>
        }
      >
        <Button
          appearance={inDrawer ? "ghost" : "subtle"}
          onClick={() =>
            dispatch(changeTheme(theme === "light" ? "dark" : "light"))
          }
          style={iconBtnStyle}
        >
          {theme === "light" ? (
            <MdOutlineDarkMode size={26} />
          ) : (
            <CiLight size={26} />
          )}
        </Button>
      </Whisper>

      <Whisper
        placement="bottom"
        trigger="hover"
        speaker={<Tooltip>{t("Change language")}</Tooltip>}
      >
        <Dropdown
          className="lang-dd" 
          placement={inDrawer ? "bottomStart" : "bottomEnd"}
          renderToggle={(props, ref) => (
            <Button
              {...props}
              ref={ref}
              appearance={inDrawer ? "ghost" : "subtle"}
              style={{
                ...iconBtnStyle,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px", 
                minHeight: 34,
                fontSize: 16,
                border:
                  theme === "light"
                    ? "1px solid rgba(46,49,146,0.15)"
                    : "1px solid rgba(46,49,146,0.35)",
              }}
            >
              <img
                src={currentLang.img}
                alt={currentLang.code}
                width={24}
                height={16}
                style={{ borderRadius: 3 }}
              />
              <span style={{ fontWeight: 800 }}>
                {(currentLang.code || "EN").toUpperCase()}
              </span>
            </Button>
          )}
        >
          {LANGS.map((l) => (
            <Dropdown.Item
              key={l.code}
              active={l.code === lang}
              onSelect={() => handleSetLang(l.code)}
              icon={<img src={l.img} alt={l.code} width={20} height={10} />}
            >
              <b>{l.code.toUpperCase()}</b>
            </Dropdown.Item>
          ))}
        </Dropdown>
      </Whisper>

      <Button
        appearance={inDrawer ? "ghost" : "subtle"}
        onClick={() => setSettingsOpen(true)}
        className={inDrawer ? "drawer-avatar-btn" : undefined}
        style={{ ...iconBtnStyle, padding: 4 }}
        aria-label="Open settings"
      >
        <Avatar src={avatarSrc || defaultAvatar} circle size="md" />
      </Button>
    </HStack>
  );

  return (
    <>
      <Navbar
        rounded={"8px"}
        style={{
          background: theme === "light" ? "#FFFFFF" : "#0B1020",
          border: theme === "light" ? "1px solid #E4E4E7" : "1px solid #1E2A4A",
          boxShadow:
            theme === "light"
              ? "0 6px 18px rgba(0,0,0,0.06)"
              : "0 6px 18px rgba(0,0,0,0.25)",
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <Navbar.Content style={{ minWidth: 0 }}>
          <Brand theme={theme} isMobile={isMobile} />
        </Navbar.Content>

     
        {!isMobile ? (
          <Navbar.Content justify="end">
            <Controls />
          </Navbar.Content>
        ) : (
          <Navbar.Content justify="end">
            <HStack spacing={8} style={{ alignItems: "center" }}>
              <Button
                appearance="subtle"
                onClick={() => setSettingsOpen(true)}
                style={{ ...iconBtnStyle, padding: 4 }}
                aria-label="Open settings"
              >
                <Avatar src={avatarSrc || defaultAvatar} circle size="md" />
              </Button>
              <Button
                appearance="subtle"
                onClick={() => setMenuOpen(true)}
                style={iconBtnStyle}
                aria-label="Open menu"
              >
                <FiMenu size={28} />
              </Button>
            </HStack>
          </Navbar.Content>
        )}
      </Navbar>


      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="right"
        size="xs"
        backdrop={true} 
        keyboard 
        closeButton={false}
      >
        <Drawer.Header>
          <Drawer.Title
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontWeight: 900 }}>{t("Menu")}</span>
          </Drawer.Title>
        </Drawer.Header>

        <Drawer.Body>
          <div style={{ marginBottom: 14 }}>
            <Brand theme={theme} isMobile={true} />
          </div>

          <Controls inDrawer />
        </Drawer.Body>
      </Drawer>

      <Drawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        placement="right"
        size="md"
        backdrop={true}
        keyboard
        closeButton={false}
        className="settings-drawer"
      >
        <Drawer.Header>
          <Drawer.Title style={{ fontWeight: 900 }}>Settings</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>
          <section className="settings-card">
            <div className="settings-card-title">Shaxsiy ma'lumotlar</div>
            <div className="settings-profile">
              <div className="settings-avatar-block">
                <div className="settings-avatar-preview">
                  <img src={avatarSrc} alt="Avatar" />
                </div>
                <label className="settings-avatar-btn">
                  {avatarUploading ? "Yuklanmoqda..." : "Rasmni tahrirlash"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const storageRef = ref(storage, "avatars/profile.jpg");
                      setAvatarUploading(true);
                      uploadBytes(storageRef, file)
                        .then(() => getDownloadURL(storageRef))
                        .then((url) => {
                          setAvatarSrc(url);
                          localStorage.setItem("settings.avatar", url);
                        })
                        .finally(() => setAvatarUploading(false));
                    }}
                  />
                </label>
                <div className="settings-avatar-hint">
                  500x500 o'lcham, JPEG, JPG, PNG format, maksimum 2MB
                </div>
              </div>
              <div className="settings-info-grid">
                <div className="settings-info-item">
                  <span>Ism</span>
                  <strong>Solijon</strong>
                </div>
                <div className="settings-info-item">
                  <span>Familiya</span>
                  <strong>Ikromov</strong>
                </div>
                <div className="settings-info-item">
                  <span>Telefon raqam</span>
                  <strong>(+998) 50 010 07 51</strong>
                </div>
                <div className="settings-info-item">
                  <span>Tug'ilgan sana</span>
                  <strong>04 Mart, 2003</strong>
                </div>
                <div className="settings-info-item">
                  <span>Jinsi</span>
                  <strong>Male</strong>
                </div>
                <div className="settings-info-item">
                  <span>HH ID</span>
                  <strong>37363</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-mini-grid">
            <div className="settings-mini-card">
              <div className="settings-mini-head">
                <span>Kirish</span>
                <Button
                  appearance="subtle"
                  style={{ padding: 0 }}
                  onClick={() => setEditingLogin((prev) => !prev)}
                  aria-label="Edit login"
                >
                  <FiEdit2 />
                </Button>
              </div>
              {editingLogin ? (
                <div className="settings-mini-edit">
                  <Input value={loginId} onChange={setLoginId} size="sm" />
                  <Button
                    appearance="primary"
                    size="sm"
                    onClick={() => setEditingLogin(false)}
                  >
                    Saqlash
                  </Button>
                </div>
              ) : (
                <div className="settings-mini-value">{loginId}</div>
              )}
            </div>
            <div className="settings-mini-card">
              <div className="settings-mini-head">
                <span>Parol</span>
                <Button
                  appearance="subtle"
                  style={{ padding: 0 }}
                  onClick={() => setEditingPassword((prev) => !prev)}
                  aria-label="Edit password"
                >
                  <FiEdit2 />
                </Button>
              </div>
              {editingPassword ? (
                <div className="settings-mini-edit">
                  <Input
                    value={password}
                    onChange={setPassword}
                    size="sm"
                    type="password"
                  />
                  <Button
                    appearance="primary"
                    size="sm"
                    onClick={() => setEditingPassword(false)}
                  >
                    Saqlash
                  </Button>
                </div>
              ) : (
                <div className="settings-mini-value">********</div>
              )}
            </div>
            <div className="settings-mini-card">
              <div className="settings-mini-head">
                <span>Bildirishnoma sozlamalari</span>
                <Button
                  appearance="subtle"
                  style={{ padding: 0 }}
                  onClick={() => setEditingNotifications((prev) => !prev)}
                  aria-label="Edit notifications"
                >
                  <FiEdit2 />
                </Button>
              </div>
              {editingNotifications ? (
                <div className="settings-mini-edit">
                  <Toggle
                    checked={notificationsOn}
                    onChange={setNotificationsOn}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                  />
                  <Button
                    appearance="primary"
                    size="sm"
                    onClick={() => setEditingNotifications(false)}
                  >
                    Saqlash
                  </Button>
                </div>
              ) : (
                <div className="settings-mini-value">
                  {notificationsOn ? "On" : "Off"}
                </div>
              )}
            </div>
          </section>

          <div className="settings-actions">
            <Button
              appearance="ghost"
              onClick={() => navigate("/login")}
              className="settings-logout"
            >
              Logout
            </Button>
          </div>
        </Drawer.Body>
      </Drawer>
    </>
  );
}

export default SiteNavbar;

