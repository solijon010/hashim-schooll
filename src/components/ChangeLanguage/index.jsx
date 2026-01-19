import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Button, RadioGroup, Radio } from "rsuite";
import { changeLanguage } from "../../createSlice/ChangeLanguage";
import { useEffect, useState } from "react";

const ChangeLanguage = ({ open, setOpen }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();

  const theme = useSelector((state) => state.theme.value);
  const language = useSelector((state) => state.language.value);

  const [lang, setLang] = useState(language);

  useEffect(() => {
    if (open) setLang(language);
  }, [open, language]);

  const handleClose = () => setOpen(false);

  const handleSaveLang = () => {
    dispatch(changeLanguage(lang));
    i18n.changeLanguage(lang);
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>{t("Change language")}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ color: theme === "light" ? "#343434" : "#cbced4" }}>
        <RadioGroup
          name="radio-group"
          value={lang}
          onChange={(value, event) => setLang(value)}
        >
          <Radio value="en">English</Radio>
          <Radio value="uz">Uzbek</Radio>
          <Radio value="ru">Русский</Radio>
        </RadioGroup>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={handleClose} appearance="subtle">
          {t("Cencel")}
        </Button>
        <Button onClick={handleSaveLang} appearance="primary">
          {t("Save")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChangeLanguage;
