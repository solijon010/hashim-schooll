import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdPayments } from "react-icons/md";
import { HiOutlineSearch } from "react-icons/hi";
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
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

const STATUS_LABELS = {
  paid: "Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
  pending: "Pending",
};

const FIRST_FEE = 200000;
const NEXT_FEE = 300000;

const EXPENSE_COLORS = ["#0ea5e9", "#f97316", "#22c55e", "#6366f1", "#f43f5e"];

const normalizeStatus = (data) => {
  const raw = (data?.status || "").toString().toLowerCase();
  if (raw) return raw;
  if (data?.isPaid === true || data?.paid === true) return "paid";
  return "unpaid";
};

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

const toInputDate = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function Payments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    date: "",
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [studentsAll, setStudentsAll] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [attendanceCounts, setAttendanceCounts] = useState({});
  const [groupFilter, setGroupFilter] = useState("all");
  const [form, setForm] = useState({
    groupId: "",
    groupName: "",
    studentId: "",
    studentName: "",
    amount: "",
    status: "paid",
    date: "",
  });
  const groups = useSelector((state) => state.groups.items || []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "payments"));
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPayments(list);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadExpenses = async () => {
      setLoadingExpenses(true);
      try {
        const snapshot = await getDocs(collection(db, "expenses"));
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExpenses(list);
      } finally {
        setLoadingExpenses(false);
      }
    };

    loadExpenses();
  }, []);

  useEffect(() => {
    if (!groups.length) {
      setStudentsAll([]);
      setAttendanceCounts({});
      setLoadingStudents(false);
      return;
    }

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const grouped = await Promise.all(
          groups.map(async (group) => {
            const snapshot = await getDocs(
              collection(db, "groups", group.id, "students"),
            );
            return snapshot.docs.map((doc) => ({
              id: doc.id,
              groupId: group.id,
              groupName: group.groupName,
              ...doc.data(),
            }));
          }),
        );
        setStudentsAll(grouped.flat());

        const attendanceMap = {};
        const attendanceDocs = await Promise.all(
          groups.map(async (group) => {
            const snapshot = await getDocs(
              query(
                collection(db, "attendance"),
                where("groupId", "==", group.id),
              ),
            );
            return snapshot.docs.map((doc) => doc.data());
          }),
        );

        attendanceDocs.flat().forEach((record) => {
          const list = record.attendance || [];
          list.forEach((student) => {
            if (!student?.id) return;
            if (student.status === "present" || student.status === "late") {
              attendanceMap[student.id] = (attendanceMap[student.id] || 0) + 1;
            }
          });
        });

        setAttendanceCounts(attendanceMap);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [groups]);

  useEffect(() => {
    if (!form.groupId) {
      setStudents([]);
      setForm((prev) => ({ ...prev, studentId: "", studentName: "" }));
      return;
    }
    const loadStudents = async () => {
      const snapshot = await getDocs(
        collection(db, "groups", form.groupId, "students"),
      );
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
    };
    loadStudents();
  }, [form.groupId]);

  const handleOpen = () => {
    setForm({
      groupId: "",
      groupName: "",
      studentId: "",
      studentName: "",
      amount: "",
      status: "paid",
      date: "",
    });
    setStudents([]);
    setShowForm(true);
  };

  const openForStudent = (student) => {
    const fullName = `${student.studentName || student.name || ""} ${
      student.lastName || student.surname || ""
    }`.trim();
    setForm({
      groupId: student.groupId || "",
      groupName: student.groupName || "",
      studentId: student.id || "",
      studentName: fullName,
      amount: "",
      status: "paid",
      date: "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.groupId || !form.studentId || !form.amount) return;
    setSaving(true);
    try {
      const dateValue = form.date ? new Date(form.date) : new Date();
      const payload = {
        groupId: form.groupId,
        groupName: form.groupName,
        studentId: form.studentId,
        studentName: form.studentName,
        amount: Number(form.amount),
        status: form.status,
        date: Timestamp.fromDate(dateValue),
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "payments"), payload);
      setPayments((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseSave = async () => {
    if (!expenseForm.name.trim() || !expenseForm.amount) return;
    setSavingExpense(true);
    try {
      const dateValue = expenseForm.date ? new Date(expenseForm.date) : new Date();
      const payload = {
        name: expenseForm.name.trim(),
        amount: Number(expenseForm.amount),
        date: Timestamp.fromDate(dateValue),
        createdAt: serverTimestamp(),
      };
      if (editingExpenseId) {
        await updateDoc(doc(db, "expenses", editingExpenseId), {
          name: payload.name,
          amount: payload.amount,
          date: payload.date,
          updatedAt: serverTimestamp(),
        });
        setExpenses((prev) =>
          prev.map((item) =>
            item.id === editingExpenseId ? { ...item, ...payload } : item,
          ),
        );
      } else {
        const docRef = await addDoc(collection(db, "expenses"), payload);
        setExpenses((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      }
      setExpenseForm({ name: "", amount: "", date: "" });
      setEditingExpenseId(null);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleExpenseEdit = (expense) => {
    const dateValue = resolveDate(expense);
    setEditingExpenseId(expense.id);
    setExpenseForm({
      name: expense.name || expense.title || "",
      amount: String(expense.amount ?? expense.sum ?? expense.total ?? ""),
      date: toInputDate(dateValue),
    });
  };

  const handleExpenseDelete = async (expenseId) => {
    if (!expenseId) return;
    await deleteDoc(doc(db, "expenses", expenseId));
    setExpenses((prev) => prev.filter((item) => item.id !== expenseId));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
      setExpenseForm({ name: "", amount: "", date: "" });
    }
  };

  const processed = useMemo(
    () =>
      payments.map((item) => {
        const amount = Number(
          item.amount ?? item.sum ?? item.total ?? item.price ?? 0,
        );
        const status = normalizeStatus(item);
        const fullName = `${item.studentName || ""} ${
          item.lastName || item.surname || ""
        }`.trim();
        return {
          ...item,
          amount,
          status,
          date: resolveDate(item),
          studentLabel:
            fullName || item.student || item.name || t("Unknown"),
          groupLabel: item.groupName || item.group || item.groupId || "-",
        };
      }),
    [payments, t],
  );

  const paidMap = useMemo(() => {
    const map = {};
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    processed.forEach((item) => {
      if (!item.studentId || item.status !== "paid") return;
      const date = item.date;
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (key === monthKey) map[item.studentId] = true;
    });
    return map;
  }, [processed]);

  const paidEverMap = useMemo(() => {
    const map = {};
    processed.forEach((item) => {
      if (!item.studentId || item.status !== "paid") return;
      map[item.studentId] = true;
    });
    return map;
  }, [processed]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return processed.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      return (
        item.studentLabel.toLowerCase().includes(term) ||
        item.groupLabel.toLowerCase().includes(term)
      );
    });
  }, [processed, query, statusFilter]);

  const studentRows = useMemo(() => {
    const now = new Date();
    const dueDay = 7;
    const isAfterDueDay = now.getDate() > dueDay;
    const term = query.trim().toLowerCase();
    return studentsAll
      .filter((student) => {
        if (groupFilter !== "all" && student.groupId !== groupFilter) {
          return false;
        }
        if (!term) return true;
        const fullName = `${student.studentName || student.name || ""} ${
          student.lastName || student.surname || ""
        }`.trim();
        return (
          fullName.toLowerCase().includes(term) ||
          (student.groupName || "").toLowerCase().includes(term)
        );
      })
      .map((student) => {
        const lessons = attendanceCounts[student.id] || 0;
        const fullName = `${student.studentName || student.name || ""} ${
          student.lastName || student.surname || ""
        }`.trim();
        const hasPaidThisMonth = paidMap[student.id] === true;
        const hasPaidEver = paidEverMap[student.id] === true;
        let status = "unpaid";
        let note = "Payment day: before the 7th";

        if (hasPaidThisMonth) {
          status = "paid";
          note = "Paid";
        } else if (!hasPaidEver && lessons >= 4) {
          status = "overdue";
          note = "Pay after 4 lessons";
        } else if (!hasPaidEver && lessons < 4) {
          status = "pending";
          note = "Payment after 4 lessons";
        } else if (isAfterDueDay) {
          status = "overdue";
          note = "Overdue";
        }

        const recommendedFee = hasPaidEver ? NEXT_FEE : FIRST_FEE;
        const feeLabel = hasPaidThisMonth
          ? t("Paid")
          : formatAmount(recommendedFee);

        return {
          id: student.id,
          studentName: fullName || "Noma'lum",
          groupName: student.groupName || "-",
          lessons,
          status,
          note,
          phone: student.phoneNumber || "",
          groupId: student.groupId,
          recommendedFee,
          feeLabel,
        };
      })
      .filter((student) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "paid") return student.status === "paid";
        return student.status !== "paid";
      });
  }, [
    studentsAll,
    groupFilter,
    attendanceCounts,
    paidMap,
    paidEverMap,
    query,
    statusFilter,
    t,
  ]);

  const stats = useMemo(() => {
    const paid = processed.filter((item) => item.status === "paid");
    const unpaid = processed.filter((item) => item.status !== "paid");
    const totalAmount = paid.reduce((sum, item) => sum + item.amount, 0);
    return {
      total: processed.length,
      paid: paid.length,
      unpaid: unpaid.length,
      totalAmount,
    };
  }, [processed]);

  const statusSummary = useMemo(() => {
    const map = { paid: 0, unpaid: 0, overdue: 0, pending: 0 };
    studentRows.forEach((row) => {
      map[row.status] = (map[row.status] || 0) + 1;
    });
    return Object.entries(map).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
    }));
  }, [studentRows]);

  const revenueTrend = useMemo(() => {
    const bucket = new Map();
    processed.forEach((item) => {
      if (item.status !== "paid" || !item.date) return;
      const date = item.date;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      const label = date.toLocaleString("uz-UZ", { month: "short" });
      const current = bucket.get(key) || { label, value: 0 };
      bucket.set(key, { ...current, value: current.value + item.amount });
    });
    return Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map((entry) => entry[1]);
  }, [processed]);

  const expenseMonths = useMemo(() => {
    const set = new Set();
    expenses.forEach((item) => {
      const date = resolveDate(item);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      set.add(key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const expenseFiltered = useMemo(() => {
    if (expenseFilter === "all") return expenses;
    return expenses.filter((item) => {
      const date = resolveDate(item);
      if (!date) return false;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      return key === expenseFilter;
    });
  }, [expenses, expenseFilter]);

  const expenseChart = useMemo(() => {
    const map = new Map();
    expenseFiltered.forEach((item) => {
      const name = (item.name || item.title || "Other").toString().trim();
      const amount = Number(item.amount ?? item.sum ?? item.total ?? 0);
      if (!Number.isFinite(amount)) return;
      map.set(name, (map.get(name) || 0) + amount);
    });
    return Array.from(map.entries()).map(([name, amount]) => ({
      name,
      amount,
    }));
  }, [expenseFiltered]);

  const totalExpenses = useMemo(
    () => expenseChart.reduce((sum, item) => sum + item.amount, 0),
    [expenseChart],
  );
  const netIncome = stats.totalAmount - totalExpenses;

  const recentPayments = useMemo(() => {
    return [...processed]
      .filter((item) => item.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }, [processed]);

  return (
    <div className="payments-page">
      <div className="payments-hero modern">
        <div>
          <p className="payments-kicker">{t("Finance overview")}</p>
          <h2>{t("Payments")}</h2>
          <p>{t("Smart tracking for income, expenses, and student status")}</p>
        </div>
        <div className="payments-hero-actions">
          <button type="button" className="payments-add" onClick={handleOpen}>
            {t("Add payment")}
          </button>
          <MdPayments size={26} />
        </div>
      </div>

      <div className="payments-grid">
        <div className="payments-left">
          <div className="payments-stats modern">
            <div className="payments-stat-card">
              <span>{t("Total payments")}</span>
              <strong>{loading ? "..." : stats.total}</strong>
            </div>
            <div className="payments-stat-card">
              <span>{t("Paid students")}</span>
              <strong>{loading ? "..." : stats.paid}</strong>
            </div>
            <div className="payments-stat-card">
              <span>{t("Unpaid students")}</span>
              <strong>{loading ? "..." : stats.unpaid}</strong>
            </div>
            <div className="payments-stat-card highlight">
              <span>{t("Total revenue")}</span>
              <strong>{loading ? "..." : formatAmount(stats.totalAmount)}</strong>
            </div>
          </div>

          <div className="payments-charts">
            <div className="payments-panel">
              <div className="payments-panel-head">
                <h3>{t("Revenue trend")}</h3>
                <span>{t("Monthly")}</span>
              </div>
              <div className="payments-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueTrend} margin={{ left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#revGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {revenueTrend.length === 0 && !loading && (
                  <div className="payments-empty">{t("No revenue yet")}</div>
                )}
              </div>
            </div>

            <div className="payments-panel">
              <div className="payments-panel-head">
                <h3>{t("Student status")}</h3>
                <span>{t("Paid / unpaid")}</span>
              </div>
              <div className="payments-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusSummary} margin={{ left: 0, right: 0 }}>
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
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {statusSummary.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={["#22c55e", "#f97316", "#dc2626", "#0ea5e9"][index % 4]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="payments-toolbar modern">
            <div className="payments-search">
              <HiOutlineSearch size={18} />
              <input
                type="search"
                placeholder={t("Search by student or group")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="payments-tabs">
              {[
                { key: "all", label: t("All") },
                { key: "paid", label: t("Paid") },
                { key: "unpaid", label: t("Unpaid") },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={statusFilter === tab.key ? "active" : ""}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="payments-group-filter">
              <span>{t("Group")}</span>
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="all">{t("All")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="payments-students">
            <div className="payments-students-head">
              <h3>{t("Student payments")}</h3>
              <span>{t("Smart fee recommendation")}</span>
            </div>
            <div className="payments-students-table">
              <div className="payments-students-row head">
                <span>{t("Student")}</span>
                <span>{t("Group")}</span>
                <span>{t("Lessons")}</span>
                <span>{t("Note")}</span>
                <span>{t("Fee")}</span>
                <span>{t("Status")}</span>
                <span>{t("Action")}</span>
              </div>
              {loadingStudents && (
                <div className="payments-empty">{t("Loading")}</div>
              )}
              {!loadingStudents && studentRows.length === 0 && (
                <div className="payments-empty">{t("No students found")}</div>
              )}
              {!loadingStudents &&
                studentRows.map((student) => (
                  <div key={student.id} className="payments-students-row">
                    <div className="payments-student">
                      <b>{student.studentName}</b>
                      <span>{student.phone}</span>
                    </div>
                    <span>{student.groupName}</span>
                    <span>{t("Lessons count", { count: student.lessons })}</span>
                    <span className="payments-note">{t(student.note)}</span>
                    <span className="payments-fee">{student.feeLabel}</span>
                    <span className={`payment-status ${student.status}`}>
                      {t(STATUS_LABELS[student.status] || student.status)}
                    </span>
                    <button
                      type="button"
                      className="payments-inline-action"
                      onClick={() => openForStudent(student)}
                    >
                      {t("Add payment")}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="payments-right">
          <div className="payments-panel highlight">
            <div className="payments-panel-head">
              <h3>{t("Cashflow")}</h3>
              <span>{t("Income vs expenses")}</span>
            </div>
            <div className="payments-cashflow">
              <div>
                <span>{t("Income")}</span>
                <strong>{formatAmount(stats.totalAmount)}</strong>
              </div>
              <div>
                <span>{t("Expenses")}</span>
                <strong>{formatAmount(totalExpenses)}</strong>
              </div>
              <div>
                <span>{t("Net")}</span>
                <strong>{formatAmount(netIncome)}</strong>
              </div>
            </div>
          </div>

          <div className="payments-panel">
            <div className="payments-panel-head">
              <h3>{t("Expenses breakdown")}</h3>
              <span>{t("Center costs")}</span>
            </div>
            <div className="payments-expense-controls">
              <label>
                <span>{t("Month")}</span>
                <select
                  value={expenseFilter}
                  onChange={(event) => setExpenseFilter(event.target.value)}
                >
                  <option value="all">{t("All months")}</option>
                  {expenseMonths.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="payments-chart">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseChart}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {expenseChart.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatAmount(value)}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {expenseChart.length === 0 && !loadingExpenses && (
                <div className="payments-empty">{t("No expenses found")}</div>
              )}
            </div>
            <div className="payments-expense-list">
              {loadingExpenses && <div className="payments-empty">{t("Loading")}</div>}
              {!loadingExpenses &&
                expenseChart.map((item, index) => (
                  <div key={item.name}>
                    <span>
                      <i
                        style={{
                          background:
                            EXPENSE_COLORS[index % EXPENSE_COLORS.length],
                        }}
                      />
                      {t(item.name)}
                    </span>
                    <b>{formatAmount(item.amount)}</b>
                  </div>
                ))}
            </div>
            <div className="payments-expense-form">
              <input
                type="text"
                placeholder={t("Expense name")}
                value={expenseForm.name}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder={t("Amount")}
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
              />
              <input
                type="date"
                value={expenseForm.date}
                onChange={(event) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={handleExpenseSave}
                disabled={savingExpense}
              >
                {savingExpense
                  ? t("Saving")
                  : editingExpenseId
                    ? t("Update")
                    : t("Add expense")}
              </button>
              {editingExpenseId && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingExpenseId(null);
                    setExpenseForm({ name: "", amount: "", date: "" });
                  }}
                >
                  {t("Cancel")}
                </button>
              )}
            </div>
            <div className="payments-expense-items">
              {expenseFiltered.map((item) => {
                const dateValue = resolveDate(item);
                return (
                  <div key={item.id} className="payments-expense-item">
                    <div>
                      <b>{item.name || item.title || t("Unknown")}</b>
                      <span>
                        {dateValue
                          ? dateValue.toLocaleDateString("uz-UZ", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <strong>
                        {formatAmount(
                          Number(item.amount ?? item.sum ?? item.total ?? 0),
                        )}
                      </strong>
                      <div className="payments-expense-actions">
                        <button type="button" onClick={() => handleExpenseEdit(item)}>
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleExpenseDelete(item.id)}
                        >
                          {t("Delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loadingExpenses && expenseFiltered.length === 0 && (
                <div className="payments-empty">{t("No expenses found")}</div>
              )}
            </div>
          </div>

          <div className="payments-panel">
            <div className="payments-panel-head">
              <h3>{t("Payment rules")}</h3>
              <span>{t("Policy")}</span>
            </div>
            <ul className="payments-rules">
              <li>{t("First payment is 200,000 so'm")}</li>
              <li>{t("Next months are 300,000 so'm")}</li>
              <li>{t("Payment day: before the 7th")}</li>
              <li>{t("New students pay after 4 lessons")}</li>
            </ul>
          </div>

          <div className="payments-panel">
            <div className="payments-panel-head">
              <h3>{t("Recent payments")}</h3>
              <span>{t("Latest")}</span>
            </div>
            <div className="payments-mini-list">
              {recentPayments.length === 0 && !loading && (
                <div className="payments-empty">{t("No payments found")}</div>
              )}
              {recentPayments.map((item) => (
                <div key={item.id} className="payments-mini-row">
                  <div>
                    <b>{item.studentLabel}</b>
                    <span>{item.groupLabel}</span>
                  </div>
                  <div>
                    <strong>{formatAmount(item.amount)}</strong>
                    <span>
                      {item.date
                        ? item.date.toLocaleDateString("uz-UZ", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="payments-modal">
          <div className="payments-modal-card">
            <div className="payments-modal-head">
              <h3>{t("Add payment")}</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                {t("Close")}
              </button>
            </div>
            <div className="payments-form">
              <label>
                {t("Group")}
                <select
                  value={form.groupId}
                  onChange={(event) => {
                    const value = event.target.value;
                    const label =
                      event.target.options[event.target.selectedIndex]
                        ?.textContent || "";
                    setForm((prev) => ({
                      ...prev,
                      groupId: value,
                      groupName: label,
                      studentId: "",
                      studentName: "",
                    }));
                  }}
                >
                  <option value="">{t("Select group")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Student")}
                <select
                  value={form.studentId}
                  onChange={(event) => {
                    const value = event.target.value;
                    const label =
                      event.target.options[event.target.selectedIndex]
                        ?.textContent || "";
                    setForm((prev) => ({
                      ...prev,
                      studentId: value,
                      studentName: label,
                    }));
                  }}
                >
                  <option value="">{t("Select student")}</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {`${student.studentName || student.name || ""} ${
                        student.lastName || student.surname || ""
                      }`.trim() || "Noma'lum"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Amount")}
                <input
                  type="number"
                  min="0"
                  placeholder={t("Amount placeholder")}
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </label>
              <label>
                {t("Date")}
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </label>
              <label>
                {t("Status")}
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="paid">{t("Paid")}</option>
                  <option value="unpaid">{t("Unpaid")}</option>
                </select>
              </label>
            </div>
            <div className="payments-modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowForm(false)}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("Saving") : t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
