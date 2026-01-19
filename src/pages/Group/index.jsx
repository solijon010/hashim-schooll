import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  where,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  Table,
  Pagination,
  Tag,
  TagGroup,
  InputGroup,
  Input,
  Stack,
  Divider,
  HStack,
  Checkbox,
  IconButton,
  Modal,
  Form,
  Button,
  SelectPicker,
  CheckPicker,
  Grid,
  Row,
  Col,
} from "rsuite";
import { useSelector } from "react-redux";
import SearchIcon from "@rsuite/icons/Search";
import CloseOutlineIcon from "@rsuite/icons/CloseOutline";
import EditIcon from "@rsuite/icons/Edit";
import TrashIcon from "@rsuite/icons/Trash";
import RemindIcon from "@rsuite/icons/legacy/Remind";
import { PiStudentThin } from "react-icons/pi";

const { Column, HeaderCell, Cell } = Table;

// Tartiblash uchun hafta kunlari
const DAYS_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const ALL_WORKING_DAYS = Object.keys(DAYS_ORDER);

function Group() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useSelector((state) => state.theme.value);

  // States
  const [groupData, setGroupData] = useState(null);
  const [students, setStudents] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);

  const [activePage, setActivePage] = useState(1);
  const [displayLimit] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    studentName: "",
    lastName: "",
    phoneNumber: "",
    targetGroupId: "",
    days: [],
  });

  const weekDaysOptions = ALL_WORKING_DAYS.map((day) => ({
    label: t(day),
    value: day,
  }));

  /**
   * 1. Hafta kunlarini UI uchun qayta ishlash
   * Rasmdagi "Every day" (probel bilan) holatini ham hisobga oladi.
   */
  const processDays = useCallback((daysArr) => {
    if (!daysArr || !Array.isArray(daysArr) || daysArr.length === 0) return [];

    // Firebase'dagi formatlarni tekshirish
    const isEveryday =
      daysArr.includes("Everyday") ||
      daysArr.includes("Every day") ||
      daysArr.length === ALL_WORKING_DAYS.length;

    if (isEveryday) return ["Everyday"];

    return daysArr
      .filter((day) => Object.prototype.hasOwnProperty.call(DAYS_ORDER, day))
      .sort((a, b) => DAYS_ORDER[a] - DAYS_ORDER[b]);
  }, []);

  /**
   * 2. Bazaga saqlashda formatlash
   * Guruh hafta kunlari bilan bir xil bo'lishini ta'minlaydi.
   */
  const prepareDaysForSave = (daysArr) => {
    if (!daysArr || daysArr.length === 0) return ["Everyday"];
    if (
      daysArr.length === ALL_WORKING_DAYS.length ||
      daysArr.includes("Everyday") ||
      daysArr.includes("Every day")
    ) {
      return ["Everyday"]; // Bazaga yagona formatda saqlaymiz
    }
    return daysArr;
  };

  const fetchTotalCount = useCallback(
    async (keyword = "") => {
      try {
        const coll = collection(db, "groups", id, "students");
        let q = coll;
        const text = keyword.trim();
        if (text !== "") {
          q = query(
            coll,
            where("studentName", ">=", text),
            where("studentName", "<=", text + "\uf8ff")
          );
        }
        const snapshot = await getCountFromServer(q);
        setTotalStudents(snapshot.data().count);
      } catch (error) {
        console.error(error);
      }
    },
    [id]
  );

  const loadData = useCallback(
    async (pageNum = 1, isNewSearch = false) => {
      setLoading(true);
      try {
        const studentsRef = collection(db, "groups", id, "students");
        let q;
        const trimmedSearch = searchKeyword.trim();

        if (trimmedSearch !== "") {
          q = query(
            studentsRef,
            orderBy("studentName"),
            where("studentName", ">=", trimmedSearch),
            where("studentName", "<=", trimmedSearch + "\uf8ff"),
            limit(displayLimit)
          );
        } else {
          if (pageNum === 1 || isNewSearch) {
            q = query(studentsRef, orderBy("studentName"), limit(displayLimit));
          } else {
            q = query(
              studentsRef,
              orderBy("studentName"),
              startAfter(lastDoc),
              limit(displayLimit)
            );
          }
        }

        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          days: processDays(doc.data().days),
        }));

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setStudents(list);
      } catch (error) {
        toast.error(t("error_loading_data"));
      } finally {
        setLoading(false);
      }
    },
    [id, searchKeyword, displayLimit, lastDoc, t, processDays]
  );

  useEffect(() => {
    const init = async () => {
      const docRef = doc(db, "groups", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupData({
          ...data,
          days: processDays(data.days || data.weekdays || []),
        });
      } else {
        navigate("/");
        return;
      }
      fetchAllGroups();
      fetchTotalCount("");
      loadData(1, true);
    };
    init();
  }, [id, navigate, processDays, fetchTotalCount]); // eslint-disable-line

  const fetchAllGroups = async (search = "") => {
    setGroupSearchLoading(true);
    try {
      const groupsRef = collection(db, "groups");
      let q = query(groupsRef, orderBy("groupName"), limit(20));
      if (search) {
        q = query(
          groupsRef,
          orderBy("groupName"),
          where("groupName", ">=", search),
          where("groupName", "<=", search + "\uf8ff"),
          limit(20)
        );
      }
      const querySnapshot = await getDocs(q);
      setAllGroups(
        querySnapshot.docs.map((d) => ({
          label: d.data().groupName,
          value: d.id,
          days: d.data().days || d.data().weekdays || [],
        }))
      );
    } finally {
      setGroupSearchLoading(false);
    }
  };

  const handleEditOpen = (rowData) => {
    const uiDays = rowData.days.includes("Everyday")
      ? ALL_WORKING_DAYS
      : rowData.days;
    setEditData({ ...rowData, targetGroupId: id, days: uiDays });
    setShowEditModal(true);
  };

  /**
   * 3. Talab qilingan asosiy mantiq:
   * Boshqa guruhga ko'chirishda student kunlarini guruh kunlariga tenglashtirish.
   */
  const handleUpdate = async () => {
    setLoading(true);
    try {
      const isGroupChanged = editData.targetGroupId !== id;
      let finalDaysToSave;

      if (isGroupChanged) {
        // Yangi tanlangan guruh ma'lumotlarini topamiz
        const targetGroup = allGroups.find(
          (g) => g.value === editData.targetGroupId
        );
        const targetGroupDays = targetGroup?.days || [];

        // Yangi guruh "Everyday" bo'lsa, student ham "Everyday" bo'ladi
        const isTargetEveryday =
          targetGroupDays.includes("Everyday") ||
          targetGroupDays.includes("Every day") ||
          targetGroupDays.length === ALL_WORKING_DAYS.length;

        if (isTargetEveryday) {
          finalDaysToSave = ["Everyday"];
        } else {
          // Aks holda studentning kunlarini yangi guruh kunlari bilan bir xil qilamiz
          finalDaysToSave = targetGroupDays;
        }

        const batch = writeBatch(db);
        batch.set(
          doc(db, "groups", editData.targetGroupId, "students", selectedId),
          {
            studentName: editData.studentName,
            lastName: editData.lastName,
            phoneNumber: editData.phoneNumber,
            days: finalDaysToSave, // Guruh kunlari bilan bir xil qilindi
          }
        );
        batch.delete(doc(db, "groups", id, "students", selectedId));
        await batch.commit();
        toast.success(t("student_moved_successfully"));
      } else {
        // Guruh o'zgarmasa oddiy edit
        finalDaysToSave = prepareDaysForSave(editData.days);
        await updateDoc(doc(db, "groups", id, "students", selectedId), {
          studentName: editData.studentName,
          lastName: editData.lastName,
          phoneNumber: editData.phoneNumber,
          days: finalDaysToSave,
        });
        toast.success(t("student_updated_successfully"));
      }

      setShowEditModal(false);
      setSelectedId(null);
      await fetchTotalCount(searchKeyword);
      await loadData(1, true);
    } catch (error) {
      toast.error(t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", id, "students", selectedId));
      toast.success(t("student_deleted_successfully"));
      setShowDeleteModal(false);
      setSelectedId(null);
      await fetchTotalCount(searchKeyword);
      await loadData(1, true);
    } catch (error) {
      toast.error(t("error_deleting_student"));
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = () => {
    setActivePage(1);
    fetchTotalCount(searchKeyword);
    loadData(1, true);
  };

  return (
    <div style={{ padding: "clamp(10px, 2vw, 20px)" }}>
      <style>{`
          .rs-table-cell { background: ${
            theme === "dark" ? "#1b212b !important" : "#fff !important"
          }; border: 1px solid ${
        theme === "dark" ? "#373d47" : "#f0f0f0"
      } !important; }
          .modal-themed .rs-modal-content { background: ${
            theme === "dark" ? "#1a1d24" : "#fff"
          }; color: ${theme === "dark" ? "#fff" : "#333"}; }
          .capitalize-text { text-transform: capitalize; }
      `}</style>

      <Stack justifyContent="space-between" style={{ marginBottom: 20 }}>
        <Stack spacing={10}>
          <h4 style={{ margin: 0, color: theme === "dark" ? "#fff" : "#222" }}>
            {t("students")}
          </h4>
          <Divider vertical />
          <HStack color="cyan">
            <PiStudentThin size={20} /> {totalStudents}
          </HStack>
        </Stack>

        <InputGroup inside style={{ width: 300 }}>
          <Input
            placeholder={t("search_placeholder")}
            value={searchKeyword}
            onChange={setSearchKeyword}
            onPressEnter={triggerSearch}
          />
          {searchKeyword && (
            <InputGroup.Button onClick={() => setSearchKeyword("")}>
              <CloseOutlineIcon />
            </InputGroup.Button>
          )}
          <InputGroup.Button onClick={triggerSearch}>
            <SearchIcon />
          </InputGroup.Button>
        </InputGroup>
      </Stack>

      <Accordion
        bordered
        defaultActiveKey={1}
        style={{ background: theme === "dark" ? "#0F131A" : "transparent" }}
      >
        <Accordion.Panel
          header={
            <Stack spacing={15}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: theme === "dark" ? "#fff" : "#111",
                }}
              >
                {groupData?.groupName || "---"}
              </span>
              <Tag color="blue" variant="filled">
                {groupData?.lessonTime}
              </Tag>
              {groupData?.days?.includes("Everyday") && (
                <Tag color="green">{t("Everyday")}</Tag>
              )}
            </Stack>
          }
          bodyFill
        >
          <Table height={450} data={students} loading={loading} cellBordered>
            <Column width={50} align="center" fixed>
              <HeaderCell>{""}</HeaderCell>
              <Cell>
                {(rowData) => (
                  <Checkbox
                    checked={selectedId === rowData.id}
                    onChange={(v, checked) =>
                      setSelectedId(checked ? rowData.id : null)
                    }
                  />
                )}
              </Cell>
            </Column>
            <Column width={60} align="center">
              <HeaderCell>№</HeaderCell>
              <Cell>{(r, i) => (activePage - 1) * displayLimit + i + 1}</Cell>
            </Column>
            <Column width={180}>
              <HeaderCell>{t("Student name")}</HeaderCell>
              <Cell className="capitalize-text" dataKey="studentName" />
            </Column>
            <Column width={180}>
              <HeaderCell>{t("Student lastName")}</HeaderCell>
              <Cell className="capitalize-text" dataKey="lastName" />
            </Column>
            <Column width={160}>
              <HeaderCell>{t("phone")}</HeaderCell>
              <Cell>{(r) => `+998 ${r.phoneNumber}`}</Cell>
            </Column>
            <Column width={120} fixed="right">
              <HeaderCell>{t("actions")}</HeaderCell>
              <Cell>
                {(rowData) =>
                  selectedId === rowData.id && (
                    <Stack spacing={8}>
                      <IconButton
                        size="sm"
                        color="blue"
                        appearance="subtle"
                        icon={<EditIcon />}
                        onClick={() => handleEditOpen(rowData)}
                      />
                      <IconButton
                        size="sm"
                        color="red"
                        appearance="subtle"
                        icon={<TrashIcon />}
                        onClick={() => setShowDeleteModal(true)}
                      />
                    </Stack>
                  )
                }
              </Cell>
            </Column>
            <Column minWidth={250} flexGrow={1}>
              <HeaderCell>{t("Weekdays")}</HeaderCell>
              <Cell>
                {(rowData) => (
                  <TagGroup>
                    {rowData.days.includes("Everyday") ? (
                      <Tag color="green" variant="filled">
                        {t("Everyday")}
                      </Tag>
                    ) : (
                      rowData.days.map((day) => (
                        <Tag key={day} color="cyan">
                          {t(day)}
                        </Tag>
                      ))
                    )}
                  </TagGroup>
                )}
              </Cell>
            </Column>
          </Table>
          <div style={{ padding: 20 }}>
            <Pagination
              total={totalStudents}
              limit={displayLimit}
              activePage={activePage}
              onChangePage={(p) => {
                setActivePage(p);
                loadData(p);
              }}
            />
          </div>
        </Accordion.Panel>
      </Accordion>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        size="md"
        className="modal-themed"
      >
        <Modal.Header>
          <Modal.Title>{t("edit_student_title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid onChange={setEditData} formValue={editData}>
            <Grid fluid>
              <Row>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("Student name")}</Form.ControlLabel>
                    <Form.Control name="studentName" />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>
                      {t("Student lastName")}
                    </Form.ControlLabel>
                    <Form.Control name="lastName" />
                  </Form.Group>
                </Col>
              </Row>
              <Row style={{ marginTop: 15 }}>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>
                      {t("Student phoneNumber")}
                    </Form.ControlLabel>
                    <Form.Control name="phoneNumber" />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("change_group")}</Form.ControlLabel>
                    <Form.Control
                      name="targetGroupId"
                      accepter={SelectPicker}
                      data={allGroups}
                      block
                      cleanable={false}
                      loading={groupSearchLoading}
                      onSearch={fetchAllGroups}
                      onOpen={() => fetchAllGroups("")}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row style={{ marginTop: 15 }}>
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel>{t("Weekdays")}</Form.ControlLabel>
                    <Form.Control
                      name="days"
                      accepter={CheckPicker}
                      data={weekDaysOptions}
                      block
                      placeholder={t("Select week days")}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Grid>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleUpdate}
            appearance="primary"
            color="blue"
            loading={loading}
          >
            {t("Save")}
          </Button>
          <Button onClick={() => setShowEditModal(false)} appearance="subtle">
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        backdrop="static"
        role="alertdialog"
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="xs"
        className="modal-themed"
      >
        <Modal.Body style={{ textAlign: "center" }}>
          <RemindIcon style={{ color: "#ffb300", fontSize: 54 }} />
          <h4 style={{ marginTop: 20 }}>{t("delete_confirm_title")}</h4>
          <p style={{ opacity: 0.7 }}>{t("delete_confirm_desc")}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={confirmDelete}
            color="red"
            appearance="primary"
            loading={loading}
          >
            {t("delete_button")}
          </Button>
          <Button onClick={() => setShowDeleteModal(false)} appearance="subtle">
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Group;
