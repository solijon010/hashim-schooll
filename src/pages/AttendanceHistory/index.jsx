import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import {
  Table,
  Loader,
  Panel,
  PanelGroup,
  Input,
  InputGroup,
  SelectPicker,
  Button,
  Stack,
  Dropdown,
  IconButton,
  Modal,
  CheckPicker,
} from "rsuite";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  LuUsers,
  LuCheck,
  LuX,
  LuSearch,
  LuClock,
  LuCalendarDays,
  LuTrendingUp,
  LuDownload,
  LuTrash2,
  // LuMoreHorizontal, // To'g'ri eksport nomi
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { BsThreeDotsVertical } from "react-icons/bs";

const AttendanceManagement = () => {
  const theme = useSelector((state) => state.theme.value);
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("3months");

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedGroupsForExport, setSelectedGroupsForExport] = useState([]);

  // 1. DATA FETCHING & AUTO-CLEANUP (90 DAYS)
  useEffect(() => {
    const q = query(collection(db, "attendance"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

      const data = snapshot.docs
        .map((d) => {
          const item = { id: d.id, ...d.data() };
          const createdDate = item.createdAt?.seconds
            ? new Date(item.createdAt.seconds * 1000)
            : new Date(item.date);

          if (now - createdDate > ninetyDaysInMs) {
            deleteDoc(doc(db, "attendance", d.id));
            return null;
          }

          // Hisob-kitobni osonlashtirish uchun Absent sonini shu yerda hisoblaymiz
          const abs =
            (item.totalStudents || 0) -
            (item.presentCount || 0) -
            (item.lateCount || 0);
          return {
            ...item,
            jsDate: createdDate,
            absentCount: abs > 0 ? abs : 0,
          };
        })
        .filter(Boolean);

      setAttendanceData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FILTERS
  const filteredGroups = useMemo(() => {
    const now = new Date();
    return attendanceData.filter((group) => {
      const groupDate = group.jsDate;
      let matchesTime =
        timeFilter === "daily"
          ? groupDate.toDateString() === now.toDateString()
          : timeFilter === "weekly"
            ? groupDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            : true;
      const matchesSearch = group.groupName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesTime && matchesSearch;
    });
  }, [attendanceData, timeFilter, searchTerm]);

  // 3. ANALYTICS DATA
  const stats = useMemo(() => {
    return filteredGroups.reduce(
      (acc, g) => {
        acc.present += g.presentCount || 0;
        acc.late += g.lateCount || 0;
        acc.absent += g.absentCount || 0;
        return acc;
      },
      { present: 0, late: 0, absent: 0 },
    );
  }, [filteredGroups]);

  const pieData = [
    { name: t("Present"), value: stats.present, color: "#10b981" },
    { name: t("Late"), value: stats.late, color: "#f59e0b" },
    { name: t("Absent"), value: stats.absent, color: "#ef4444" },
  ];

  // 4. DELETE FUNCTION
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "attendance", id));
      toast.success(t("Ma'lumot o'chirildi"));
    } catch (error) {
      toast.error(t("Xatolik yuz berdi"));
    }
  };

  // 5. EXCEL EXPORT
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Davomat");

    worksheet.columns = [
      { header: "GURUH", key: "group", width: 20 },
      { header: "SANA", key: "date", width: 15 },
      { header: "O'QUVCHI", key: "name", width: 25 },
      { header: "STATUS", key: "status", width: 15 },
      { header: "KECHIKISH", key: "delay", width: 15 },
    ];

    const exportData =
      selectedGroupsForExport.length > 0
        ? filteredGroups.filter((g) => selectedGroupsForExport.includes(g.id))
        : filteredGroups;

    exportData.forEach((group) => {
      group.attendance?.forEach((st) => {
        worksheet.addRow({
          group: group.groupName,
          date: group.date,
          name: `${st.studentName} ${st.lastName || ""}`,
          status: st.status.toUpperCase(),
          delay: st.delay || "-",
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Davomat_Hisoboti_${Date.now()}.xlsx`);
    setShowExportModal(false);
  };

  const glassClass = isDark
    ? "bg-white/[0.03] border-white/10 backdrop-blur-md"
    : "bg-white/80 border-slate-200 backdrop-blur-md";

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader size="lg" vertical />
      </div>
    );

  return (
    <div
      className={`min-h-screen p-4 md:p-5 transition-all duration-500  rounded-2xl ${isDark ? "text-white" : "text-slate-800"}`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            {t(timeFilter)}{" "}
            <span className="text-cyan-500 underline decoration-4">
              {t("Attendance")}
            </span>
          </h1>

          <Stack spacing={10} wrap>
            <SelectPicker
              data={[
                { label: t("Daily"), value: "daily" },
                { label: t("Weekly"), value: "weekly" },
                { label: t("3 Months"), value: "3months" },
              ]}
              value={timeFilter}
              onChange={setTimeFilter}
              cleanable={false}
              className="!w-40"
            />
            <InputGroup inside className={`!w-64 ${glassClass}`}>
              <Input
                placeholder={t("Search group...")}
                value={searchTerm}
                onChange={setSearchTerm}
              />
              <InputGroup.Addon>
                <LuSearch />
              </InputGroup.Addon>
            </InputGroup>
            <Button
              color="green"
              appearance="primary"
              onClick={() => setShowExportModal(true)}
            >
              <LuDownload className="mr-2" /> Excel
            </Button>
          </Stack>
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BAR CHART: Kelgan, Kechikkan va Kelmaganlar */}
          <div
            className={`lg:col-span-2 p-6 rounded-[2.5rem] border ${glassClass}`}
          >
            <h5 className="text-xs font-black uppercase mb-6 flex items-center gap-2">
              <LuTrendingUp className="text-cyan-500" />{" "}
              {t("Attendance Dynamics")}
            </h5>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredGroups.slice(0, 10)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#ffffff10" : "#00000010"}
                  />
                  <XAxis
                    dataKey="groupName"
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "15px",
                      background: isDark ? "#1e293b" : "#fff",
                      border: "none",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  />
                  {/* BARLAR: HAR BIR STATUS UCHUN */}
                  <Bar
                    name={t("Present")}
                    dataKey="presentCount"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                  <Bar
                    name={t("Late")}
                    dataKey="lateCount"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                  <Bar
                    name={t("Absent")}
                    dataKey="absentCount"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHART */}
          <div
            className={`p-6 rounded-[2.5rem] border relative flex flex-col items-center justify-center ${glassClass}`}
          >
            <h5 className="absolute top-8 left-8 text-xs font-black uppercase">
              {t("Summary")}
            </h5>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                <p className="text-3xl font-black">
                  {stats.present + stats.late + stats.absent}
                </p>
                <p className="text-[10px] font-bold opacity-40 uppercase">
                  {t("Total")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LIST SECTION */}
        <PanelGroup accordion className="space-y-4">
          {filteredGroups.map((group) => (
            <Panel
              key={group.id}
              header={
                <div className="flex flex-col md:flex-row justify-between items-center w-full pr-2 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-white shadow-lg">
                      <LuUsers size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-black tracking-tight">
                        {group.groupName}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-bold opacity-60 uppercase">
                        <span>
                          <LuCalendarDays className="inline mr-1" />{" "}
                          {group.date}
                        </span>
                        <span>
                          <LuClock className="inline mr-1" /> {group.lessonTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      <Badge
                        label={`${t("Present")}: ${group.presentCount}`}
                        color="bg-emerald-500"
                      />
                      <Badge
                        label={`${t("Late")}: ${group.lateCount}`}
                        color="bg-amber-500"
                      />
                      <Badge
                        label={`${t("Absent")}: ${group.absentCount}`}
                        color="bg-red-500"
                      />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        renderToggle={(props, ref) => (
                          <IconButton
                            {...props}
                            ref={ref}
                            icon={<BsThreeDotsVertical />}
                            appearance="subtle"
                            circle
                          />
                        )}
                        placement="bottomEnd"
                      >
                        <Dropdown.Item
                          icon={<LuTrash2 className="text-red-500" />}
                          onClick={() => handleDelete(group.id)}
                        >
                          {t("O'chirish")}
                        </Dropdown.Item>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              }
              className={`${glassClass} !rounded-2xl overflow-hidden`}
            >
              <Table
                data={group.attendance || []}
                autoHeight
                rowHeight={60}
                className="!bg-transparent"
              >
                <Table.Column flexGrow={1}>
                  <Table.HeaderCell className="font-black opacity-50 uppercase text-[10px]">
                    {t("Student")}
                  </Table.HeaderCell>
                  <Table.Cell>
                    {(rowData) => (
                      <div className="flex flex-col">
                        <span className="font-black text-cyan-500 text-sm uppercase">
                          {rowData.studentName}
                        </span>
                        <span className="text-[10px] opacity-50">
                          {rowData.lastName}
                        </span>
                      </div>
                    )}
                  </Table.Cell>
                </Table.Column>
                <Table.Column width={150} align="right">
                  <Table.HeaderCell className="font-black opacity-50 uppercase text-[10px]">
                    {t("Status")}
                  </Table.HeaderCell>
                  <Table.Cell>
                    {(rowData) => (
                      <StatusBadge
                        status={rowData.status}
                        delay={rowData.delay}
                      />
                    )}
                  </Table.Cell>
                </Table.Column>
              </Table>
            </Panel>
          ))}
        </PanelGroup>

        {/* MODAL */}
        <Modal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          size="xs"
        >
          <Modal.Header>
            <Modal.Title className="font-black uppercase">
              {t("Excel Export")}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <CheckPicker
              data={filteredGroups.map((g) => ({
                label: g.groupName,
                value: g.id,
              }))}
              value={selectedGroupsForExport}
              onChange={setSelectedGroupsForExport}
              block
              placeholder={t("Guruhlarni tanlang")}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={handleExport}
              color="green"
              appearance="primary"
              block
              className="!rounded-xl font-black uppercase"
            >
              {t("Yuklab olish")}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

// HELPERS
const Badge = ({ label, color }) => (
  <span
    className={`${color}/10 ${color.replace("bg-", "text-")} px-2 py-1 rounded-lg text-[10px] font-black border border-current/10`}
  >
    {label}
  </span>
);

const StatusBadge = ({ status, delay }) => {
  const config = {
    present: {
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: <LuCheck />,
      label: "Kelgan",
    },
    late: {
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: <LuClock />,
      label: delay || "Kechikkan",
    },
    absent: {
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      icon: <LuX />,
      label: "Kelmagan",
    },
  };
  const s = config[status?.toLowerCase()] || config.absent;
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-[10px] font-black uppercase ${s.color}`}
    >
      {s.icon} {s.label}
    </div>
  );
};

export default React.memo(AttendanceManagement);
