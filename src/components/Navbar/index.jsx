import {
  Navbar,
  Avatar,
  HStack,
  Button,
  Tooltip,
  Whisper,
  Dropdown,
} from "rsuite";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TbLayoutSidebar } from "react-icons/tb";
import { MdOutlineDarkMode } from "react-icons/md";
import { CiLight } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { changeTheme } from "../../createSlice/ThemeSlice";
import { changeLanguage } from "../../createSlice/ChangeLanguage";

const LANGS = [
  { code: "en", img: "/flags/en.png" },
  { code: "uz", img: "/flags/uz.png" },
  { code: "ru", img: "/flags/ru.png" },
];

const Brand = ({ theme }) => (
  <Link
    to={"/"}
    style={{
      textDecoration: "none",
      color: theme === "light" ? "#111827" : "#E5E7EB",
    }}
  >
    <HStack>
      <img src="/NavLogo1.png" width={75} alt="Logo" />
      <h3 className="font-black text-2xl text-[#2E3192]">HASHIM SCHOOL</h3>
    </HStack>
  </Link>
);

function SiteNavbar({ setExpanded }) {
  const theme = useSelector((state) => state.theme.value);
  const lang = useSelector((state) => state.language.value);
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();

  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0];

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

  return (
    <Navbar
      rounded={"8px"}
      style={{
        background: theme === "light" ? "#FFFFFF" : "#0B1020",
        border: theme === "light" ? "1px solid #E4E4E7" : "1px solid #1E2A4A",
        boxShadow:
          theme === "light"
            ? "0 6px 18px rgba(0,0,0,0.06)"
            : "0 6px 18px rgba(0,0,0,0.25)",
      }}
    >
      <Navbar.Content>
        <Brand theme={theme} />
      </Navbar.Content>

      <HStack>
        <Whisper
          placement="bottom"
          trigger="hover"
          speaker={<Tooltip>{t("Sidebar")}</Tooltip>}
        >
          <Button
            appearance="subtle"
            onClick={() => setExpanded((prev) => !prev)}
            style={iconBtnStyle}
          >
            <TbLayoutSidebar size={30} />
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
            appearance="subtle"
            onClick={() =>
              dispatch(changeTheme(theme === "light" ? "dark" : "light"))
            }
            style={iconBtnStyle}
          >
            {theme === "light" ? (
              <MdOutlineDarkMode size={30} />
            ) : (
              <CiLight size={30} />
            )}
          </Button>
        </Whisper>

        <Whisper
          placement="bottom"
          trigger="hover"
          speaker={<Tooltip>{t("Change language")}</Tooltip>}
        >
          <Dropdown
            placement="bottomEnd"
            renderToggle={(props, ref) => (
              <Button
                {...props}
                ref={ref}
                appearance="subtle"
                style={{
                  ...iconBtnStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  border:
                    theme === "light"
                      ? "1px solid rgba(46,49,146,0.15)"
                      : "1px solid rgba(46,49,146,0.35)",
                }}
              >
                <img
                  src={currentLang.img}
                  alt={currentLang.code}
                  width={30}
                  height={14}
                  style={{ borderRadius: 2 }}
                />
                <span style={{ fontWeight: 800 }}>
                  {(currentLang.code || "EN").toUpperCase()}
                </span>
              </Button>
            )}
          >
            {LANGS.map((l) => (
              <Dropdown.Item
                w={"100px"}
                key={l.code}
                active={l.code === lang}
                onSelect={() => handleSetLang(l.code)}
                icon={<img src={l.img} alt={l.code} width={20} height={14} />}
              >
                <b>{(l.code || "").toUpperCase()}</b>
              </Dropdown.Item>
            ))}
          </Dropdown>
        </Whisper>

        <Avatar src="https://i.pravatar.cc/150?u=19" circle size="lg" />
      </HStack>
    </Navbar>
  );
}

export default SiteNavbar;
