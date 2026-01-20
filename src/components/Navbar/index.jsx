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
} from "rsuite";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TbLayoutSidebar } from "react-icons/tb";
import { MdOutlineDarkMode } from "react-icons/md";
import { CiLight } from "react-icons/ci";
import { FiMenu } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { changeTheme } from "../../createSlice/ThemeSlice";
import { changeLanguage } from "../../createSlice/ChangeLanguage";

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

  const isMobile = useIsMobile(768);
  const [open, setOpen] = useState(false);

 
  useEffect(() => {
    const el =
      document.getElementById("app-content") || document.getElementById("root");
    if (!el) return;

    if (open) el.classList.add("app-blur");
    else el.classList.remove("app-blur");

    return () => el.classList.remove("app-blur");
  }, [open]);

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
    <HStack spacing={8} style={{ alignItems: "center", flexWrap: "wrap" }}>
      <Whisper
        placement="bottom"
        trigger="hover"
        speaker={<Tooltip>{t("Sidebar")}</Tooltip>}
      >
        <Button
          appearance={inDrawer ? "ghost" : "subtle"}
          onClick={() => {
            setExpanded?.((prev) => !prev); 
            if (inDrawer) setOpen(false);
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

      <Avatar src="https://i.pravatar.cc/150?u=19" circle size="md" />
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
            <Button
              appearance="subtle"
              onClick={() => setOpen(true)}
              style={iconBtnStyle}
              aria-label="Open menu"
            >
              <FiMenu size={28} />
            </Button>
          </Navbar.Content>
        )}
      </Navbar>


      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        size="xs"
        backdrop={true} 
        keyboard 
      >
        <Drawer.Header>
          <Drawer.Title
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontWeight: 900 }}>{t("Menu")}</span>
          </Drawer.Title>

          <Button
            appearance="subtle"
            onClick={() => setOpen(false)}
            style={{
              ...iconBtnStyle,
              position: "absolute",
              right: 10,
              top: 10,
            }}
            aria-label="Close"
          >
            <IoClose size={24} />
          </Button>
        </Drawer.Header>

        <Drawer.Body>
          <div style={{ marginBottom: 14 }}>
            <Brand theme={theme} isMobile={true} />
          </div>

          <Controls inDrawer />
        </Drawer.Body>
      </Drawer>
    </>
  );
}

export default SiteNavbar;
