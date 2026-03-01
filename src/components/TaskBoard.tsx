'use client';

import { useState } from 'react';
import { Task } from '@prisma/client';
import { createTask, updateTaskStatus, deleteTask, convertTaskToExpense } from '@/actions/tasks';
import styles from './TaskBoard.module.css';

interface TaskBoardProps {
    apartmentId: string;
    initialTasks: Task[];
}

export default function TaskBoard({ apartmentId, initialTasks }: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [loading, setLoading] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState('');

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createTask({
            apartmentId,
            title,
            description: description || null,
            cost: cost ? parseFloat(cost) : null,
            status: 'TODO'
        });
        if (res.success && res.task) {
            setTasks([res.task, ...tasks]);
            setTitle('');
            setDescription('');
            setCost('');
        } else {
            alert(res.error || "Erreur lors de l'ajout");
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        // Optimistic UI update
        const currentTasks = [...tasks];
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        const res = await updateTaskStatus(taskId, newStatus);
        if (!res.success) {
            // Revert on error
            setTasks(currentTasks);
            alert(res.error || "Erreur lors de la mise à jour");
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm("Voulez-vous supprimer cette tâche ?")) return;
        const currentTasks = [...tasks];
        setTasks(tasks.filter(t => t.id !== taskId));

        const res = await deleteTask(taskId);
        if (!res.success) {
            setTasks(currentTasks);
            alert(res.error || "Erreur lors de la suppression");
        }
    };

    const handleConvertToExpense = async (taskId: string) => {
        if (!confirm("Voulez-vous convertir cette intervention en Dépense ? Une dépense sera ajoutée aux statistiques de cet appartement.")) return;
        setLoading(true);
        const res = await convertTaskToExpense(taskId);
        if (res.success) {
            alert("✅ Dépense créée avec succès !");
            // Optionally, mark as archived or keep it DONE
        } else {
            alert("❌ Erreur : " + res.error);
        }
        setLoading(false);
    };

    const renderTaskCard = (task: Task) => (
        <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>
                    {task.title}
                    {task.tenantId && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", backgroundColor: "#fffbeb", color: "#d97706", padding: "0.2rem 0.5rem", borderRadius: "10px", fontWeight: "bold" }}>Locataire</span>}
                </span>
                <button onClick={() => handleDelete(task.id)} className={styles.deleteBtn} title="Supprimer">×</button>
            </div>
            {task.description && <div className={styles.taskDesc}>{task.description}</div>}

            <div className={styles.taskFooter}>
                <span>{new Date(task.createdAt).toLocaleDateString('fr-FR')}</span>
                {task.cost !== null && <span className={styles.taskCost}>{task.cost.toFixed(2)} €</span>}
            </div>

            <div className={styles.actions}>
                {task.status === 'TODO' && (
                    <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className={`${styles.btn} ${styles.btnPrimary}`}>
                        Passer En Cours
                    </button>
                )}
                {task.status === 'IN_PROGRESS' && (
                    <>
                        <button onClick={() => handleUpdateStatus(task.id, 'TODO')} className={styles.btn}>
                            À Faire
                        </button>
                        <button onClick={() => handleUpdateStatus(task.id, 'DONE')} className={`${styles.btn} ${styles.btnSuccess}`}>
                            Terminer
                        </button>
                    </>
                )}
                {task.status === 'DONE' && (
                    <>
                        <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className={styles.btn}>
                            En Cours
                        </button>
                        {task.cost !== null && task.cost > 0 && (
                            <button onClick={() => handleConvertToExpense(task.id)} disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
                                {loading ? '...' : 'Créer Dépense'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    const todoTasks = tasks.filter(t => t.status === 'TODO');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    const doneTasks = tasks.filter(t => t.status === 'DONE');

    return (
        <div>
            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className={styles.addForm}>
                <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Ajouter une intervention</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Titre de l'intervention</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Réparation fuite évier"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Coût estimé ou final (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                            placeholder="Optionnel"
                        />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label>Description (Optionnel)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Détails de l'intervention..."
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading || !title} className={styles.addBtn}>
                    {loading ? 'Ajout...' : '+ Ajouter la tâche'}
                </button>
            </form>

            {/* Kanban Board */}
            <div className={styles.board}>
                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        À Faire <span className={styles.taskCount}>{todoTasks.length}</span>
                    </div>
                    {todoTasks.map(renderTaskCard)}
                </div>

                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        En Cours <span className={styles.taskCount}>{inProgressTasks.length}</span>
                    </div>
                    {inProgressTasks.map(renderTaskCard)}
                </div>

                <div className={styles.column}>
                    <div className={styles.columnTitle}>
                        Terminé <span className={styles.taskCount}>{doneTasks.length}</span>
                    </div>
                    {doneTasks.map(renderTaskCard)}
                </div>
            </div>
        </div>
    );
}
