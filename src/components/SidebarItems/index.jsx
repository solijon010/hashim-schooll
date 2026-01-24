import DashboardIcon from "@rsuite/icons/Dashboard";
import PeoplesIcon from "@rsuite/icons/Peoples";
import SettingIcon from "@rsuite/icons/Setting";
import PieChartIcon from "@rsuite/icons/PieChart";
import DataAuthorizeIcon from "@rsuite/icons/DataAuthorize";
import { Nav } from "rsuite";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MdPayment } from "react-icons/md";
import { PiClipboardText } from "react-icons/pi";
import { useSelector } from "react-redux";
import React, { useState } from "react";

function SidebarItems({ isExpanded, mobileBottom = false }) {
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useSelector((state) => state.theme.value);
  const menuPlacement = mobileBottom ? "topStart" : "rightStart";
  const menuStyle = undefined;
  const iconSize = mobileBottom ? 16 : 15;
  const [openKey, setOpenKey] = useState(null);
  const handleToggle = (key) => (open) => {
    if (!mobileBottom) return;
    setOpenKey(open ? key : null);
  };

  const groups = useSelector((state) => state.groups.items);

  return (
    <Nav activeKey={location.pathname}>
      <Nav.Item
        as={NavLink}
        to={"/"}
        eventKey="/"
        icon={<DashboardIcon size={iconSize} />}
      >
        {mobileBottom ? null : t("Dashboard")}
      </Nav.Item>
      <Nav.Menu
        eventKey="/groups"
        title={mobileBottom ? null : t("Groups")}
        icon={<PeoplesIcon size={iconSize} />}
        placement={menuPlacement}
        menuStyle={menuStyle}
        className={mobileBottom ? "mobile-bottom-dropdown" : undefined}
        open={mobileBottom ? openKey === "groups" : undefined}
        onToggle={handleToggle("groups")}
      >
        {groups.map((group) => (
          <Nav.Item
            key={group.id}
            as={NavLink}
            to={`/group/${group.id}`}
            eventKey={`/group/${group.id}`}
            style={{
              borderTop:
                theme === "light" ? "1px solid #e5e5e5" : "1px solid #4b4b4b",
              padding: "8px 12px",
              borderRadius: "0px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 500, fontSize: "14px" }}>
                {group.groupName.split("")[0].toUpperCase() +
                  group.groupName.slice(1).toLowerCase()}
              </span>
              <span style={{ fontSize: "12px", color: "#888" }}>
                {group.lessonTime}
              </span>
            </div>
          </Nav.Item>
        ))}
      </Nav.Menu>
      <Nav.Menu
        eventKey="/attendance"
        title={mobileBottom ? null : t("Attendance")}
        icon={<PiClipboardText size={iconSize} />}
        placement={menuPlacement}
        menuStyle={menuStyle}
        className={mobileBottom ? "mobile-bottom-dropdown" : undefined}
        open={mobileBottom ? openKey === "attendance" : undefined}
        onToggle={handleToggle("attendance")}
      >
        <Nav.Item
          eventKey="/dailyAttendancet"
          as={NavLink}
          to={"/dailyAttendance"}
        >
          {t("Daily Attendance")}
        </Nav.Item>
        <Nav.Item
          eventKey="/attendanceHistory"
          as={NavLink}
          to={"/attendanceHistory"}
        >
          {t("Attendance History")}
        </Nav.Item>
        <Nav.Item
          eventKey="/markAttendance"
          as={NavLink}
          to={"/markAttendance"}
        >
          {t("Mark attendance")}
        </Nav.Item>
      </Nav.Menu>
      <Nav.Item
        as={NavLink}
        to={"/payments"}
        eventKey="/payments"
        icon={<MdPayment size={iconSize} />}
      >
        {mobileBottom ? null : t("Payments")}
      </Nav.Item>
    </Nav>
  );
}

export default React.memo(SidebarItems);
