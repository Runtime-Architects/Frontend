import { Delete24Regular, Add24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

import styles from "./ClearChatButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
    translationKey?: string;
    iconType?: "delete" | "add";
}

export const ClearChatButton = ({ className, disabled, onClick, translationKey = "clearChat", iconType = "delete" }: Props) => {
    const { t, i18n } = useTranslation();
    const icon = iconType === "add" ? <Add24Regular /> : <Delete24Regular />;
    
    return (
        <div className={`${styles.container} ${className ?? ""}`}>
            <Button icon={icon} disabled={disabled} onClick={onClick}>
                {t(translationKey)}
            </Button>
        </div>
    );
};
