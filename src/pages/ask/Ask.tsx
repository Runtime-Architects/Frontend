import { Helmet } from "react-helmet-async";
import styles from "./Ask.module.css";

export function Component(): JSX.Element {
    return (
        <div className={styles.askContainer}>
            <Helmet>
                <title>Ask Page</title>
            </Helmet>
            <h1>Ask Page</h1>
            <p>This is a minimal Ask page. Add components here one by one.</p>
        </div>
    );
}

Component.displayName = "Ask";