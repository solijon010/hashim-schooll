import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdPayments } from "react-icons/md";
import { HiOutlineSearch } from "react-icons/hi";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

const STATUS_LABELS = {
  paid: "To'langan",
  unpaid: "To'lanmagan",
  overdue: "Kechiktirilgan",
  pending: "Kutilmoqda",
};

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

function Payments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
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
            fullName || item.student || item.name || "Noma'lum",
          groupLabel: item.groupName || item.group || item.groupId || "-",
        };
      }),
    [payments],
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
        let note = "To'lov kuni: har oyning 7-sanasi";

        if (hasPaidThisMonth) {
          status = "paid";
          note = "To'lov qilingan";
        } else if (!hasPaidEver && lessons >= 4) {
          status = "overdue";
          note = "4-darsdan keyin to'lov kerak";
        } else if (!hasPaidEver && lessons < 4) {
          status = "pending";
          note = "4-darsdan keyin to'lov";
        } else if (isAfterDueDay) {
          status = "overdue";
          note = "Muddat o'tgan";
        }

        return {
          id: student.id,
          studentName: fullName || "Noma'lum",
          groupName: student.groupName || "-",
          lessons,
          status,
          note,
          phone: student.phoneNumber || "",
          groupId: student.groupId,
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

  return (
    <div className="payments-page">
      <div className="payments-hero">
        <div>
          <h2>{t("Payments")}</h2>
          <p>To'lovlarni nazorat qilish va kuzatish</p>
        </div>
        <MdPayments size={26} />
      </div>

      <div className="payments-stats">
        <div className="payments-stat-card">
          <span>Jami</span>
          <strong>{loading ? "..." : stats.total}</strong>
        </div>
        <div className="payments-stat-card">
          <span>To'langan</span>
          <strong>{loading ? "..." : stats.paid}</strong>
        </div>
        <div className="payments-stat-card">
          <span>To'lanmagan</span>
          <strong>{loading ? "..." : stats.unpaid}</strong>
        </div>
        <div className="payments-stat-card highlight">
          <span>Jami tushum</span>
          <strong>{loading ? "..." : formatAmount(stats.totalAmount)}</strong>
        </div>
      </div>

      <div className="payments-toolbar">
        <div className="payments-search">
          <HiOutlineSearch size={18} />
          <input
            type="search"
            placeholder="O'quvchi yoki guruh bo'yicha qidirish"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="button" className="payments-add" onClick={handleOpen}>
          To'lov qo'shish
        </button>
        <div className="payments-tabs">
          {[
            { key: "all", label: "Barchasi" },
            { key: "paid", label: "To'langan" },
            { key: "unpaid", label: "To'lanmagan" },
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
      </div>

      <div className="payments-students">
        <div className="payments-students-head">
          <h3>O'quvchilar to'lovi</h3>
          <div className="payments-group-filter">
            <span>Guruh</span>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="all">Barchasi</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.groupName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="payments-students-table">
          <div className="payments-students-row head">
            <span>O'quvchi</span>
            <span>Guruh</span>
            <span>Darslar</span>
            <span>Izoh</span>
            <span>Holat</span>
            <span>Amal</span>
          </div>
          {loadingStudents && (
            <div className="payments-empty">Yuklanmoqda...</div>
          )}
          {!loadingStudents && studentRows.length === 0 && (
            <div className="payments-empty">O'quvchilar topilmadi</div>
          )}
          {!loadingStudents &&
            studentRows.map((student) => (
              <div key={student.id} className="payments-students-row">
                <div className="payments-student">
                  <b>{student.studentName}</b>
                  <span>{student.phone}</span>
                </div>
                <span>{student.groupName}</span>
                <span>{student.lessons} ta</span>
                <span className="payments-note">{student.note}</span>
                <span className={`payment-status ${student.status}`}>
                  {STATUS_LABELS[student.status] || student.status}
                </span>
                <button
                  type="button"
                  className="payments-inline-action"
                  onClick={() => openForStudent(student)}
                >
                  To'lov kiritish
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="payments-table">
        <div className="payments-row head">
          <span>O'quvchi</span>
          <span>Guruh</span>
          <span>Sana</span>
          <span>Summa</span>
          <span>Holat</span>
        </div>
        {loading && <div className="payments-empty">Yuklanmoqda...</div>}
        {!loading && filtered.length === 0 && (
          <div className="payments-empty">To'lovlar topilmadi</div>
        )}
        {!loading &&
          filtered.map((item) => (
            <div key={item.id} className="payments-row">
              <div className="payments-student">
                <b>{item.studentLabel}</b>
                <span>{item.phone || item.phoneNumber || ""}</span>
              </div>
              <span>{item.groupLabel}</span>
              <span>
                {item.date
                  ? item.date.toLocaleDateString("uz-UZ", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </span>
              <span>{formatAmount(item.amount)}</span>
              <span className={`payment-status ${item.status}`}>
                {STATUS_LABELS[item.status] || item.status}
              </span>
            </div>
          ))}
      </div>

      {showForm && (
        <div className="payments-modal">
          <div className="payments-modal-card">
            <div className="payments-modal-head">
              <h3>To'lov qo'shish</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                Yopish
              </button>
            </div>
            <div className="payments-form">
              <label>
                Guruh
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
                  <option value="">Guruh tanlang</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                O'quvchi
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
                  <option value="">O'quvchi tanlang</option>
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
                Summa
                <input
                  type="number"
                  min="0"
                  placeholder="Masalan: 300000"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </label>
              <label>
                Sana
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </label>
              <label>
                Holat
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="paid">To'langan</option>
                  <option value="unpaid">To'lanmagan</option>
                </select>
              </label>
            </div>
            <div className="payments-modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowForm(false)}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
