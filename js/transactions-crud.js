import { db } from './config.js';

const transactionsColRef = db.collection('transactions'); // db.collection() est l'API v8

export async function addTransaction(transactionData) {
    try {
        const docRef = await transactionsColRef.add(transactionData); // API v8: .add() directement sur la collection
        console.log("Nouvelle transaction ajoutée avec l'ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Erreur lors de l'ajout de la transaction:", error);
        throw new Error("Impossible d'ajouter la transaction: " + error.message);
    }
}

export async function updateTransaction(docId, transactionData) {
    try {
        const docRef = transactionsColRef.doc(docId); // API v8: .doc() pour obtenir la référence au document
        await docRef.update(transactionData); // API v8: .update() sur la référence du document
        console.log("Transaction mise à jour avec l'ID:", docId);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la transaction:", error);
        throw new Error("Impossible de modifier la transaction: " + error.message);
    }
}

export async function deleteTransaction(docId) {
    try {
        const docRef = transactionsColRef.doc(docId); // API v8: .doc() pour obtenir la référence au document
        await docRef.delete(); // API v8: .delete() sur la référence du document
        console.log("Transaction supprimée avec l'ID:", docId);
    } catch (error) {
        console.error("Erreur lors de la suppression de la transaction:", error);
        throw new Error("Impossible de supprimer la transaction: " + error.message);
    }
}