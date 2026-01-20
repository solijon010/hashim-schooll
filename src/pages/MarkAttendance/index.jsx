import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  InputPicker,
  Table,
  Button,
  Modal,
  InputNumber,
  Stack,
  Loader,
  Message,
  toaster,
} from "rsuite";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import {
  FaClock,
  FaCalendarDay,
  FaCheck,
  FaTimes,
  FaClock as FaClockIcon,
  FaRedo,
} from "react-icons/fa";
import { MdSave } from "react-icons/md";
import { TbClockHour4 } from "react-icons/tb";
import { FaPeopleGroup } from "react-icons/fa6";

const { Column, HeaderCell, Cell } = Table;

function MarkAttendance() {
  const theme = useSelector((state) => state.theme.value);
  const groups = useSelector((state) => state.groups.items);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date().getDay()];
  });
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [delayMinute, setDelayMinute] = useState(5);
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceDate] = useState(new Date().toISOString().split("T")[0]);

  const groupOptions =
    groups?.map((item) => ({
      label: item.groupName,
      value: item.id,
    })) || [];

  const checkAnyAttendanceMarked = () => {
    return students.some(
      (student) =>
        student.status === "present" ||
        student.status === "absent" ||
        student.status === "late",
    );
  };

  useEffect(() => {
    if (selectedGroupId && groups?.length > 0) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSelectedGroupData(group);
        checkAttendanceAndFetchStudents(group);
      }
    }
  }, [selectedGroupId, selectedDay, groups, attendanceDate]);

  const checkAttendanceAndFetchStudents = async (currentGroup) => {
    setLoading(true);
    try {
      const attQuery = query(
        collection(db, "attendance"),
        where("groupId", "==", currentGroup.id),
        where("date", "==", attendanceDate),
      );
      const attSnapshot = await getDocs(attQuery);

      if (!attSnapshot.empty) {
        setIsAlreadyMarked(true);
        const attendanceData = attSnapshot.docs[0].data();
        setStudents(attendanceData.attendance || []);
      } else {
        setIsAlreadyMarked(false);
        const studentsRef = collection(
          db,
          "groups",
          currentGroup.id,
          "students",
        );
        const studentSnapshot = await getDocs(studentsRef);
        setStudents(
          studentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            status: "pending",
            delay: null,
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toaster.push(
        <Message type="error" closable>
          Ma'lumot yuklashda xatolik!
        </Message>,
        { placement: "topCenter" },
      );
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  const updateStatus = (id, status) => {
    if (isAlreadyMarked) {
      toaster.push(
        <Message type="warning" closable>
          Davomat allaqachon saqlangan!
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    if (status === "late") {
      setActiveStudentId(id);
      setIsModalOpen(true);
    } else {
      setIsDirty(true);
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, delay: null } : s)),
      );
    }
  };

  const handleDelaySubmit = () => {
    setIsDirty(true);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === activeStudentId
          ? { ...s, status: "late", delay: `${delayMinute} daqiqa` }
          : s,
      ),
    );
    setIsModalOpen(false);
    setDelayMinute(5);
  };

  const handleSaveAttendance = async () => {
    if (!checkAnyAttendanceMarked()) {
      toaster.push(
        <Message type="warning" closable>
          Kamida bitta talabaning davomatini belgilang!
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    if (isAlreadyMarked) {
      toaster.push(
        <Message type="warning" closable>
          Bugungi davomat allaqachon saqlangan!
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    if (!selectedGroupId) {
      toaster.push(
        <Message type="warning" closable>
          Iltimos, avval guruh tanlang!
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    setSaving(true);
    try {
      const attendanceData = {
        groupId: selectedGroupId,
        groupName: selectedGroupData.groupName,
        lessonTime: selectedGroupData.lessonTime,
        day: selectedDay,
        date: attendanceDate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalStudents: students.length,
        presentCount: students.filter((s) => s.status === "present").length,
        absentCount: students.filter((s) => s.status === "absent").length,
        lateCount: students.filter((s) => s.status === "late").length,
        attendance: students,
      };

      await addDoc(collection(db, "attendance"), attendanceData);
      toaster.push(
        <Message type="success" closable>
          Davomat muvaffaqiyatli saqlandi!
        </Message>,
        { placement: "topCenter" },
      );
      setIsAlreadyMarked(true);
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving attendance:", error);
      toaster.push(
        <Message type="error" closable>
          Davomatni saqlashda xatolik!
        </Message>,
        { placement: "topCenter" },
      );
    } finally {
      setSaving(false);
    }
  };

  const getStudentRowStyle = (status) => {
    const baseStyle = {
      borderLeftWidth: "4px",
      transition: "all 0.3s ease",
    };

    switch (status) {
      case "present":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(34, 197, 94, 0.08)"
              : "rgba(34, 197, 94, 0.04)",
          borderLeftColor: theme === "dark" ? "#22c55e" : "#16a34a",
        };
      case "absent":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(239, 68, 68, 0.08)"
              : "rgba(239, 68, 68, 0.04)",
          borderLeftColor: theme === "dark" ? "#ef4444" : "#dc2626",
        };
      case "late":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(245, 158, 11, 0.08)"
              : "rgba(245, 158, 11, 0.04)",
          borderLeftColor: theme === "dark" ? "#f59e0b" : "#d97706",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderLeftColor: "transparent",
        };
    }
  };

  const dayNames = {
    Monday: "Dushanba",
    Tuesday: "Seshanba",
    Wednesday: "Chorshanba",
    Thursday: "Payshanba",
    Friday: "Juma",
    Saturday: "Shanba",
    Sunday: "Yakshanba",
  };

  const StatusBadge = ({ status, delay }) => {
    const baseClass =
      "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all";

    switch (status) {
      case "present":
        return (
          <div
            className={`${baseClass} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800`}
          >
            <FaCheck className="text-xs" /> Keldi
          </div>
        );
      case "absent":
        return (
          <div
            className={`${baseClass} bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800`}
          >
            <FaTimes className="text-xs" /> Kelmadi
          </div>
        );
      case "late":
        return (
          <div
            className={`${baseClass} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`}
          >
            <TbClockHour4 className="text-xs" /> Kechikdi{" "}
            {delay && <span className="text-[10px] opacity-80">({delay})</span>}
          </div>
        );
      default:
        return (
          <div
            className={`${baseClass} bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700`}
          >
            <FaClockIcon className="text-xs" /> Kutilmoqda
          </div>
        );
    }
  };

  const ActionButton = ({
    icon: Icon,
    label,
    status,
    rowStatus,
    onClick,
    disabled,
  }) => {
    const isActive = rowStatus === status;

    const getButtonClass = () => {
      const baseClass =
        "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all";

      if (isActive) {
        switch (status) {
          case "present":
            return `${baseClass} bg-emerald-500 text-white shadow-sm`;
          case "absent":
            return `${baseClass} bg-rose-500 text-white shadow-sm`;
          case "late":
            return `${baseClass} bg-amber-500 text-white shadow-sm`;
          default:
            return baseClass;
        }
      }

      if (disabled) {
        return `${baseClass} bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed`;
      }

      switch (status) {
        case "present":
          return `${baseClass} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30`;
        case "absent":
          return `${baseClass} bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30`;
        case "late":
          return `${baseClass} bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30`;
        default:
          return baseClass;
      }
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={getButtonClass()}
      >
        <Icon className="text-xs" /> {label}
      </button>
    );
  };

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div
          className={`mb-6 p-6 rounded-2xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} shadow-sm`}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1
                className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                Davomat Qilish
              </h1>
              <p
                className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
              >
                Guruh tanlab, talabalarning davomatini belgilang
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <InputPicker
                data={groupOptions}
                className={`w-full sm:w-56 ${theme === "dark" ? "dark:!bg-slate-800 dark:!border-slate-700" : ""}`}
                placeholder="Guruhni tanlang"
                onChange={setSelectedGroupId}
                value={selectedGroupId}
                size="md"
              />

              <div
                className={`px-4 py-2 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}
              >
                <p
                  className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                >
                  {dayNames[selectedDay]} •{" "}
                  {selectedDay ===
                  new Date().toLocaleDateString("en-US", { weekday: "long" })
                    ? "Bugun"
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {selectedGroupId ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-blue-900/40" : "bg-blue-100"} text-blue-600 dark:text-blue-400`}
                  >
                    <FaPeopleGroup />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Guruh
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {selectedGroupData?.groupName}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-emerald-900/40" : "bg-emerald-100"} text-emerald-600 dark:text-emerald-400`}
                  >
                    <FaClock />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Dars vaqti
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {selectedGroupData?.lessonTime}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-purple-900/40" : "bg-purple-100"} text-purple-600 dark:text-purple-400`}
                  >
                    <FaCalendarDay />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Kun
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {dayNames[selectedDay]}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <Button
                  appearance="primary"
                  color="green"
                  startIcon={<MdSave />}
                  className="w-full h-full"
                  onClick={handleSaveAttendance}
                  disabled={!isDirty || isAlreadyMarked || saving}
                  loading={saving}
                >
                  {isAlreadyMarked ? "Saqlangan" : "Saqlash"}
                </Button>
              </div>
            </div>

            {isAlreadyMarked && (
              <div
                className={`mb-6 p-4 rounded-xl ${theme === "dark" ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"} border`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <MdSave className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        Davomat saqlangan
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {attendanceDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {students.filter((s) => s.status === "present").length}
                      </div>
                      <div className="text-xs text-emerald-500 dark:text-emerald-500">
                        Keldi
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {students.filter((s) => s.status === "late").length}
                      </div>
                      <div className="text-xs text-amber-500 dark:text-amber-500">
                        Kechikdi
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                        {students.filter((s) => s.status === "absent").length}
                      </div>
                      <div className="text-xs text-rose-500 dark:text-rose-500">
                        Kelmadi
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div
              className={`rounded-xl overflow-hidden shadow-sm ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
            >
              <Table
                autoHeight
                data={students}
                loading={loading}
                rowHeight={70}
                rowStyle={(rowData) => getStudentRowStyle(rowData.status)}
                className={theme === "dark" ? "!bg-slate-900" : ""}
                headerHeight={60}
              >
                <Column width={60} align="center" fixed>
                  <HeaderCell
                    className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                  >
                    №
                  </HeaderCell>
                  <Cell>
                    {(_, index) => (
                      <div
                        className={`font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                      >
                        {index + 1}
                      </div>
                    )}
                  </Cell>
                </Column>

                <Column flexGrow={2} minWidth={200}>
                  <HeaderCell
                    className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Talaba
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="py-2">
                        <div
                          className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                        >
                          {rowData.studentName} {rowData.lastName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {rowData.phoneNumber || "Telefon raqami yo'q"}
                        </div>
                      </div>
                    )}
                  </Cell>
                </Column>

                <Column width={150} align="center">
                  <HeaderCell
                    className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Holati
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="flex justify-center">
                        <StatusBadge
                          status={rowData.status}
                          delay={rowData.delay}
                        />
                      </div>
                    )}
                  </Cell>
                </Column>

                <Column width={280} align="center">
                  <HeaderCell
                    className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Harakatlar
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton
                          icon={FaCheck}
                          label="Keldi"
                          status="present"
                          rowStatus={rowData.status}
                          onClick={() => updateStatus(rowData.id, "present")}
                          disabled={
                            isAlreadyMarked || rowData.status === "present"
                          }
                        />
                        <ActionButton
                          icon={FaTimes}
                          label="Yo'q"
                          status="absent"
                          rowStatus={rowData.status}
                          onClick={() => updateStatus(rowData.id, "absent")}
                          disabled={
                            isAlreadyMarked || rowData.status === "absent"
                          }
                        />
                        <ActionButton
                          icon={TbClockHour4}
                          label="Kech"
                          status="late"
                          rowStatus={rowData.status}
                          onClick={() => updateStatus(rowData.id, "late")}
                          disabled={
                            isAlreadyMarked || rowData.status === "late"
                          }
                        />

                        {rowData.status !== "pending" && !isAlreadyMarked && (
                          <button
                            onClick={() => {
                              setStudents((prev) =>
                                prev.map((s) =>
                                  s.id === rowData.id
                                    ? { ...s, status: "pending", delay: null }
                                    : s,
                                ),
                              );
                              setIsDirty(true);
                            }}
                            className={`p-1.5 rounded-lg ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"} transition-colors`}
                          >
                            <FaRedo className="text-xs text-slate-500 dark:text-slate-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </Cell>
                </Column>
              </Table>

              {students.length === 0 && !loading && (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">👨‍🎓</div>
                  <p
                    className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                  >
                    Guruhda talabalar mavjud emas
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            className={`h-[50vh] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-300"}`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}
            >
              📚
            </div>
            <h3
              className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
            >
              Guruhni tanlang
            </h3>
            <p
              className={`text-center max-w-sm text-sm ${theme === "dark" ? "text-slate-500" : "text-slate-600"}`}
            >
              Davomat qilish uchun yuqoridagi ro'yxatdan guruhni tanlang
            </p>
          </div>
        )}

        {/* Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="xs"
          backdrop="static"
          className={theme === "dark" ? "dark" : ""}
        >
          <Modal.Header>
            <Modal.Title
              className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${theme === "dark" ? "bg-amber-900/40" : "bg-amber-100"}`}
                >
                  <TbClockHour4 className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div>Kechikish vaqti</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Talaba necha daqiqa kechikdi?
                  </div>
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="py-6">
            <div className="text-center mb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Quyidagi talaba uchun kechikish vaqtini kiriting:
              </p>
              <p className="font-medium dark:text-white">
                {students.find((s) => s.id === activeStudentId)?.studentName ||
                  "Talaba"}
              </p>
            </div>

            <Stack justifyContent="center" className="mb-4">
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Daqiqa
                </p>
                <InputNumber
                  value={delayMinute}
                  onChange={(v) => setDelayMinute(Number(v))}
                  min={0}
                  max={120}
                  style={{ width: 100 }}
                  className="text-center"
                />
              </div>
            </Stack>

            <div className="text-center">
              <div
                className={`inline-block px-3 py-1.5 rounded-lg ${theme === "dark" ? "bg-amber-900/30" : "bg-amber-100"}`}
              >
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {delayMinute} daqiqa
                </span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => setIsModalOpen(false)}
              appearance="subtle"
              className="mr-2"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleDelaySubmit}
              appearance="primary"
              color="yellow"
              className="px-6"
            >
              Tasdiqlash
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default MarkAttendance;
