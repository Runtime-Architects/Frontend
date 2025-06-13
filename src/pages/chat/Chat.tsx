import { Helmet } from "react-helmet-async";
import styles from "./Chat.module.css";

const Chat = () => {
    return (
        <div className={styles.container}>
            <Helmet>
                <title>Chat Page</title>
            </Helmet>
            <h1>Chat Page</h1>
            <p>This is a minimal Chat page. Add components here one by one.</p>
        </div>
    );
};

export default Chat;