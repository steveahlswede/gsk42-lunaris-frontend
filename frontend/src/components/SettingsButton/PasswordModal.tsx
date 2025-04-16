// PasswordModal.tsx
import React, { useState } from "react";
import Modal from "react-modal";
import styles from "./PasswordModal.module.css";

interface PasswordModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    onPasswordSubmit: (password: string) => void;
}

export const PasswordModal = ({ isOpen, onRequestClose, onPasswordSubmit }: PasswordModalProps) => {
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPasswordSubmit(password);
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={onRequestClose} contentLabel="Password Modal">
            <div className={styles.modalContent}>
                <h2>Passwort eingeben:</h2>
                <form onSubmit={handleSubmit}>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={styles.input} />
                    <button type="submit" className={styles.button}>
                        Bestätigen
                    </button>
                </form>
            </div>
        </Modal>
    );
};
