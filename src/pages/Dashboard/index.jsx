import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuLayoutDashboard } from "react-icons/lu";
import { MdPayments } from "react-icons/md";
import { PiClipboardText } from "react-icons/pi";
import { IoPeopleOutline } from "react-icons/io5";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

function Dashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    groups: 0,
    students: 0,
    paid: 0,
    unpaid: 0,
    present: 0,
    late: 0,
    absent: 0,
  });
  const [groupCounts, setGroupCounts] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const groupsSnap = await getDocs(collection(db, "groups"));
        const groups = groupsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const groupStats = await Promise.all(
          groups.map(async (group) => {
            const countSnap = await getCountFromServer(
              collection(db, "groups", group.id, "students"),
            );
            return {
              id: group.id,
              name: group.groupName || "Group",
              count: countSnap.data().count || 0,
            };
          }),
        );

        const totalStudents = groupStats.reduce(
          (sum, item) => sum + item.count,
          0,
        );

        const today = new Date().toISOString().split("T")[0];
        const attendanceSnap = await getDocs(
          query(collection(db, "attendance"), where("date", "==", today)),
        );

        let present = 0;
        let late = 0;
        let absent = 0;
        attendanceSnap.forEach((doc) => {
          const data = doc.data() || {};
          present += data.presentCount || 0;
          late += data.lateCount || 0;
          absent += data.absentCount || 0;
        });

        const paymentsSnap = await getDocs(collection(db, "payments"));
        let paid = 0;
        let unpaid = 0;
        paymentsSnap.forEach((doc) => {
          const data = doc.data() || {};
          const isPaid =
            data.status === "paid" || data.isPaid === true || data.paid === true;
          if (isPaid) paid += 1;
          else unpaid += 1;
        });

        setStats({
          groups: groups.length,
          students: totalStudents,
          paid,
          unpaid,
          present,
          late,
          absent,
        });

        setGroupCounts(
          groupStats.sort((a, b) => b.count - a.count).slice(0, 6),
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const attendanceTotal = stats.present + stats.late + stats.absent;
  const attendanceGradient = useMemo(() => {
    if (!attendanceTotal) return "conic-gradient(#e2e8f0 0 100%)";
    const presentPct = (stats.present / attendanceTotal) * 100;
    const latePct = (stats.late / attendanceTotal) * 100;
    const absentPct = (stats.absent / attendanceTotal) * 100;
    const lateStart = presentPct;
    const absentStart = presentPct + latePct;
    return `conic-gradient(#22c55e 0 ${presentPct}%, #f59e0b ${lateStart}% ${
      presentPct + latePct
    }%, #ef4444 ${absentStart}% ${absentStart + absentPct}%)`;
  }, [attendanceTotal, stats.present, stats.late, stats.absent]);

  const paidTotal = stats.paid + stats.unpaid;
  const paidPct = paidTotal ? Math.round((stats.paid / paidTotal) * 100) : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div>
          <h2>{t("Dashboard")}</h2>
          <p>{t("Overall statistics and status")}</p>
        </div>
        <LuLayoutDashboard size={24} />
      </div>

      <div className="dashboard-cards">
        <div className="dash-card">
          <div className="dash-card-icon">
            <IoPeopleOutline size={20} />
          </div>
          <div>
            <span>{t("Students")}</span>
            <strong>{loading ? "..." : stats.students}</strong>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-icon">
            <LuLayoutDashboard size={20} />
          </div>
          <div>
            <span>{t("Groups")}</span>
            <strong>{loading ? "..." : stats.groups}</strong>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-icon">
            <PiClipboardText size={20} />
          </div>
          <div>
            <span>{t("Today's present")}</span>
            <strong>{loading ? "..." : stats.present}</strong>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-icon">
            <MdPayments size={20} />
          </div>
          <div>
            <span>{t("Paid students")}</span>
            <strong>{loading ? "..." : stats.paid}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Students in groups")}</h4>
            <span>{t("Top groups")}</span>
          </div>
          <div className="dash-bars">
            {groupCounts.length === 0 && !loading && (
              <div className="dash-empty">{t("No data")}</div>
            )}
            {groupCounts.map((group) => (
              <div key={group.id} className="dash-bar-row">
                <span>{group.name}</span>
                <div className="dash-bar">
                  <div
                    className="dash-bar-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        group.count === 0 ? 6 : group.count * 6,
                      )}%`,
                    }}
                  />
                </div>
                <b>{group.count}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Attendance today")}</h4>
            <span>{t("Present/Late/Absent")}</span>
          </div>
          <div className="dash-attendance">
            <div
              className="dash-donut"
              style={{ background: attendanceGradient }}
            >
              <div className="dash-donut-center">
                <strong>{attendanceTotal}</strong>
                <span>{t("Total")}</span>
              </div>
            </div>
            <div className="dash-legend">
              <div>
                <i className="legend-dot present" />
                <span>{t("Present")}</span>
                <b>{stats.present}</b>
              </div>
              <div>
                <i className="legend-dot late" />
                <span>{t("Late")}</span>
                <b>{stats.late}</b>
              </div>
              <div>
                <i className="legend-dot absent" />
                <span>{t("Absent")}</span>
                <b>{stats.absent}</b>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Payments status")}</h4>
            <span>{t("Paid vs Unpaid")}</span>
          </div>
          <div className="dash-payments">
            <div className="dash-progress">
              <div
                className="dash-progress-fill"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="dash-payments-meta">
              <div>
                <span>{t("Paid")}</span>
                <b>{stats.paid}</b>
              </div>
              <div>
                <span>{t("Unpaid")}</span>
                <b>{stats.unpaid}</b>
              </div>
              <div>
                <span>{t("Percent")}</span>
                <b>{paidPct}%</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
