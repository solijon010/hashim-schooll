import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuLayoutDashboard } from "react-icons/lu";
import { MdPayments } from "react-icons/md";
import { PiClipboardText } from "react-icons/pi";
import { IoPeopleOutline } from "react-icons/io5";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

const resolveDate = (data) => {
  const raw = data?.date || data?.paidAt || data?.createdAt || data?.updatedAt;
  if (!raw) return null;
  if (typeof raw?.toDate === "function") return raw.toDate();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAmount = (value) => {
  if (!Number.isFinite(value)) return "-";
  return `${value.toLocaleString("uz-UZ")} so'm`;
};

const formatShortAmount = (value) => {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
};

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
    revenue: 0,
  });
  const [groupCounts, setGroupCounts] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);

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
        let revenue = 0;
        const bucket = new Map();
        paymentsSnap.forEach((doc) => {
          const data = doc.data() || {};
          const isPaid =
            data.status === "paid" || data.isPaid === true || data.paid === true;
          if (isPaid) paid += 1;
          else unpaid += 1;

          if (isPaid) {
            const amount = Number(
              data.amount ?? data.sum ?? data.total ?? data.price ?? 0,
            );
            revenue += amount;
            const date = resolveDate(data);
            if (date) {
              const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1,
              ).padStart(2, "0")}`;
              const label = date.toLocaleString("uz-UZ", { month: "short" });
              const current = bucket.get(key) || { label, value: 0 };
              bucket.set(key, { ...current, value: current.value + amount });
            }
          }
        });

        setStats({
          groups: groups.length,
          students: totalStudents,
          paid,
          unpaid,
          present,
          late,
          absent,
          revenue,
        });

        setGroupCounts(
          groupStats.sort((a, b) => b.count - a.count).slice(0, 6),
        );

        setRevenueTrend(
          Array.from(bucket.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map((entry) => entry[1]),
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const attendanceData = useMemo(
    () => [
      { name: t("Present"), value: stats.present, color: "#22c55e" },
      { name: t("Late"), value: stats.late, color: "#f59e0b" },
      { name: t("Absent"), value: stats.absent, color: "#ef4444" },
    ],
    [stats.present, stats.late, stats.absent, t],
  );

  const paymentBreakdown = useMemo(
    () => [
      { name: t("Paid"), value: stats.paid, color: "#22c55e" },
      { name: t("Unpaid"), value: stats.unpaid, color: "#f97316" },
    ],
    [stats.paid, stats.unpaid, t],
  );

  return (
    <div className="dashboard">
      <div className="dashboard-hero modern">
        <div>
          <p className="dashboard-kicker">{t("Overview")}</p>
          <h2>{t("Dashboard")}</h2>
          <p>{t("Overall statistics and status")}</p>
        </div>
        <LuLayoutDashboard size={24} />
      </div>

      <div className="dashboard-cards modern">
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
            <span>{t("Revenue")}</span>
            <strong>{loading ? "..." : formatAmount(stats.revenue)}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid modern">
        <div className="dash-panel wide">
          <div className="dash-panel-head">
            <h4>{t("Monthly revenue")}</h4>
            <span>{t("Income flow")}</span>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueTrend} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e3192" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2e3192" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatShortAmount(value)}
                  tick={{ fill: "var(--muted)" }}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value)}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2e3192"
                  fill="url(#dashRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            {revenueTrend.length === 0 && !loading && (
              <div className="dash-empty">{t("No data")}</div>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Attendance today")}</h4>
            <span>{t("Present/Late/Absent")}</span>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={attendanceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {attendanceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-legend modern">
            {attendanceData.map((item) => (
              <div key={item.name}>
                <i className="legend-dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Payments status")}</h4>
            <span>{t("Paid vs Unpaid")}</span>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {paymentBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-legend modern">
            {paymentBreakdown.map((item) => (
              <div key={item.name}>
                <i className="legend-dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h4>{t("Students in groups")}</h4>
            <span>{t("Top groups")}</span>
          </div>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={groupCounts} margin={{ left: 0, right: 0 }}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2e3192" />
              </BarChart>
            </ResponsiveContainer>
            {groupCounts.length === 0 && !loading && (
              <div className="dash-empty">{t("No data")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
