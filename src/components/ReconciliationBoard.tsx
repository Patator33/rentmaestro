"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { getExpectedRents, matchRentPayment, createDirectExpense } from "@/actions/reconciliation";

interface Apartment {
    id: string;
    name: string | null;
    address: string;
    city: string;
}

interface Props {
    apartments: Apartment[];
}

export default function ReconciliationBoard({ apartments }: Props) {
    const [expectedRents, setExpectedRents] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);

    // Column Mapping
    const [colDate, setColDate] = useState("");
    const [colDesc, setColDesc] = useState("");
    const [colAmount, setColAmount] = useState("");

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        getExpectedRents().then(res => {
            if (res.success && res.data) {
                setExpectedRents(res.data);
            }
        });
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.meta.fields) {
                    setHeaders(results.meta.fields);
                    // Try to auto-guess columns
                    const h = results.meta.fields.map(f => f.toLowerCase());
                    const guessDate = results.meta.fields.find((_, i) => h[i].includes("date"));
                    const guessDesc = results.meta.fields.find((_, i) => h[i].includes("libellé") || h[i].includes("motif") || h[i].includes("label"));
                    const guessAmount = results.meta.fields.find((_, i) => h[i].includes("montant") || h[i].includes("crédit") || h[i].includes("débit"));

                    if (guessDate) setColDate(guessDate);
                    if (guessDesc) setColDesc(guessDesc);
                    if (guessAmount) setColAmount(guessAmount);
                }
                setParsedData(results.data);
            }
        });
    };

    const parseAmount = (val: string | number) => {
        if (!val) return 0;
        if (typeof val === "number") return val;
        // Handle French formats: "1 500,00" or "- 50,00"
        const clean = val.replace(/\s/g, "").replace(",", ".");
        return parseFloat(clean) || 0;
    };

    const isColumnsMapped = colDate && colDesc && colAmount;

    const handleMatchRent = async (rentId: string, dateStr: string, matchedAmount: number, index: number) => {
        // Date might be DD/MM/YYYY or YYYY-MM-DD
        // Simple heuristic for DD/MM/YYYY to YYYY-MM-DD
        let isoDate = dateStr;
        if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        setActionLoading(`rent-${index}`);
        const res = await matchRentPayment(rentId, isoDate, matchedAmount);
        if (res.success) {
            alert("Loyer validé !");
            setExpectedRents(prev => prev.filter(r => r.id !== rentId));
        } else {
            alert(res.error);
        }
        setActionLoading(null);
    };

    const handleCreateExpense = async (e: React.FormEvent, index: number, rawAmount: number, rawDate: string) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const aptId = formData.get("apartmentId") as string;
        const category = formData.get("category") as string;
        const desc = formData.get("description") as string;

        if (!aptId || !category) return alert("Sélectionnez un appartement et une catégorie.");

        let isoDate = rawDate;
        if (rawDate.includes("/")) {
            const parts = rawDate.split("/");
            if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        setActionLoading(`exp-${index}`);
        const res = await createDirectExpense(aptId, category, desc, rawAmount, isoDate);
        if (res.success) {
            alert("Dépense enregistrée !");
            // Mark line as processed locally (we could just use state to hide it)
            setParsedData(prev => prev.map((row, i) => i === index ? { ...row, _processed: true } : row));
        } else {
            alert(res.error);
        }
        setActionLoading(null);
    };

    return (
        <div>
            {/* Step 1: Upload */}
            <div style={{ marginBottom: "2rem" }}>
                <label className="std-label">1. Sélectionnez votre fichier CSV bancaire</label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="std-input"
                    style={{ background: 'var(--surface)' }}
                />
            </div>

            {/* Step 2: Mapping */}
            {headers.length > 0 && (
                <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", background: "var(--surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <label className="std-label">Colonne Date</label>
                        <select className="std-input" value={colDate} onChange={e => setColDate(e.target.value)}>
                            <option value="">-- Sélecionner --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <label className="std-label">Colonne Libellé (Description)</label>
                        <select className="std-input" value={colDesc} onChange={e => setColDesc(e.target.value)}>
                            <option value="">-- Sélecionner --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <label className="std-label">Colonne Montant</label>
                        <select className="std-input" value={colAmount} onChange={e => setColAmount(e.target.value)}>
                            <option value="">-- Sélecionner --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Step 3: Transactions List */}
            {isColumnsMapped && parsedData.length > 0 && (
                <div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Lignes à rapprocher</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {parsedData.map((row, idx) => {
                            if (row._processed) return null;

                            const dLine = row[colDate] || "";
                            const descLine = row[colDesc] || "";
                            const amountRaw = row[colAmount] || "";
                            if (!dLine && !amountRaw) return null; // skip empty

                            const amount = parseAmount(amountRaw);
                            const isCredit = amount > 0;

                            // Try to find a matching rent if credit
                            let possibleRent = null;
                            if (isCredit) {
                                // Match exactly or roughly
                                possibleRent = expectedRents.find(r => Math.abs(r.amount - amount) < 2); // 2 euros margin
                            }

                            return (
                                <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", background: "var(--surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>

                                    {/* Left: Bank transaction details */}
                                    <div style={{ flex: "1 1 300px", display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isCredit ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isCredit ? "var(--success)" : "var(--error)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                                            {isCredit ? "+" : "-"}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{descLine}</div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{dLine} • <span style={{ color: isCredit ? "var(--success)" : "var(--error)", fontWeight: "bold" }}>{amount.toFixed(2)} €</span></div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div style={{ flex: "1 1 400px" }}>
                                        {isCredit ? (
                                            possibleRent ? (
                                                <div style={{ background: "rgba(59,130,246,0.1)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59,130,246,0.3)" }}>
                                                    <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                                                        <strong>Correspondance Loyer trouvée :</strong> {possibleRent.lease.tenant.firstName} {possibleRent.lease.tenant.lastName} ({possibleRent.amount}€)
                                                    </div>
                                                    <button
                                                        disabled={actionLoading === `rent-${idx}`}
                                                        onClick={() => handleMatchRent(possibleRent.id, dLine, amount, idx)}
                                                        className="std-add-button" style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem", background: "var(--success)" }}
                                                    >
                                                        {actionLoading === `rent-${idx}` ? "Validation..." : "✅ Valider ce loyer"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                    Aucun loyer en attente avec ce montant précis.
                                                </div>
                                            )
                                        ) : (
                                            // Debit form
                                            <form onSubmit={(e) => handleCreateExpense(e, idx, amount, dLine)} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                                                <div style={{ flex: 1, minWidth: "150px" }}>
                                                    <select name="apartmentId" required className="std-input" style={{ padding: "0.3rem", fontSize: "0.85rem" }}>
                                                        <option value="">Lier à un appartement...</option>
                                                        {apartments.map(apt => (
                                                            <option key={apt.id} value={apt.id}>{apt.name || apt.address}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1, minWidth: "120px" }}>
                                                    <select name="category" required className="std-input" style={{ padding: "0.3rem", fontSize: "0.85rem" }}>
                                                        <option value="">Catégorie...</option>
                                                        <option value="MANAGEMENT">Frais de Gestion</option>
                                                        <option value="MAINTENANCE">Entretien/Réparation</option>
                                                        <option value="INSURANCE">Assurance</option>
                                                        <option value="TAX">Taxes</option>
                                                        <option value="OTHER">Autres</option>
                                                    </select>
                                                </div>
                                                <div style={{ flex: "2 1 200px" }}>
                                                    <input type="text" name="description" defaultValue={descLine} required className="std-input" style={{ padding: "0.3rem", fontSize: "0.85rem" }} placeholder="Description dépense" />
                                                </div>
                                                <button type="submit" disabled={actionLoading === `exp-${idx}`} className="std-add-button" style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem", background: "var(--error)" }}>
                                                    {actionLoading === `exp-${idx}` ? "..." : "Enregistrer Dépense"}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
