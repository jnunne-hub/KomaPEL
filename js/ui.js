import { formatCategoryName, formatDateToInput, parseInputDate } from './utils.js';
import { safeParseFloat } from './utils.js';

// Références aux éléments DOM
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
const tabTransactions = document.getElementById('tab-transactions');
const tabReport = document.getElementById('tab-report');
const sectionTransactions = document.getElementById('section-transactions');
const sectionReport = document.getElementById('section-report');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterDate = document.getElementById('filter-date');
const searchTermInput = document.getElementById('search-term');
const transactionsTableBody = document.getElementById('transactions-table-body');
const noTransactionsMessage = document.getElementById('no-transactions');
const transactionModal = document.getElementById('transaction-modal');
const modalTitle = document.getElementById('modal-title');
const transactionForm = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');

// CHAMPS DU MODAL
const transactionEvenementInput = document.getElementById('transaction-evenement');
const transactionProprietaireInput = document.getElementById('transaction-proprietaire');
const transactionMoyenPaiementInput = document.getElementById('transaction-moyen-paiement');
const transactionPaimentPlusInput = document.getElementById('transaction-paiment-plus');
const transactionFactureInput = document.getElementById('transaction-facture');

const transactionDateInput = document.getElementById('transaction-date');
const transactionDescriptionInput = document.getElementById('transaction-description');
const transactionCategorySelect = document.getElementById('transaction-category');
const transactionAmountInput = document.getElementById('transaction-amount');
const transactionTypeRadios = document.getElementsByName('transaction-type');
const transactionNotesInput = document.getElementById('transaction-notes');
const cancelTransactionBtn = document.getElementById('cancel-transaction');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');

// Pagination DOM elements
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfoSpan = document.getElementById('page-info');

// Bouton de fermeture en "X" du modal
const closeModalXBtn = document.getElementById('close-modal-x');

// Sélecteur d'année scolaire
const schoolYearSelect = document.getElementById('school-year-select');

// Bouton d'exportation PDF
const exportPdfBtn = document.getElementById('export-pdf-btn');
// Contenu du bouton d'exportation PDF
const exportPdfButtonContent = document.getElementById('export-pdf-button-content');
const originalExportBtnContent = exportPdfButtonContent.innerHTML; // Stocker le contenu original

// Exporte les références DOM nécessaires pour main.js
export {
    tabTransactions, tabReport, sectionTransactions, sectionReport,
    filterType, filterCategory, filterDate, searchTermInput,
    addTransactionBtn, cancelTransactionBtn, transactionForm,
    cancelDeleteBtn, confirmDeleteBtn,
    prevPageBtn, nextPageBtn,
    closeModalXBtn,
    schoolYearSelect,
    exportPdfBtn
};

let currentTransactionDocId = null;

// --- Fonctions de gestion de l'affichage ---

export function updateSummary(transactions) {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
    const balance = totalIncome - totalExpense;
    
    totalIncomeEl.textContent = totalIncome.toFixed(2).replace('.', ',') + ' €';
    totalExpenseEl.textContent = totalExpense.toFixed(2).replace('.', ',') + ' €';
    balanceEl.textContent = balance.toFixed(2).replace('.', ',') + ' €';
    
    if (balance < 0) {
        balanceEl.classList.remove('text-blue-600');
        balanceEl.classList.add('text-red-600');
    } else {
        balanceEl.classList.remove('text-red-600');
        balanceEl.classList.add('text-blue-600');
    }
}

export function initCategoryFilter(transactions) {
    const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
    const currentFilterVal = filterCategory.value;

    filterCategory.innerHTML = '<option value="all">Toutes</option>';
    
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = formatCategoryName(category);
        filterCategory.appendChild(option);
    });

    if (categories.includes(currentFilterVal)) {
        filterCategory.value = currentFilterVal;
    }
}

export function renderTransactionsTable(transactionsToDisplay, totalTransactionsCount, currentPage, itemsPerPage) {
    transactionsTableBody.innerHTML = '';
    
    if (transactionsToDisplay.length === 0) {
        noTransactionsMessage.classList.remove('hidden');
        transactionsTableBody.classList.add('hidden');
    } else {
        noTransactionsMessage.classList.add('hidden');
        transactionsTableBody.classList.remove('hidden');
        
        transactionsToDisplay.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'transaction-row';
            
            // transaction.date est déjà un objet Date JS standard grâce à main.js onSnapshot
            const transactionDate = transaction.date; 
            const formattedDate = transactionDate.toLocaleDateString('fr-FR');
            const formattedAmount = (transaction.amount || 0).toFixed(2).replace('.', ',') + ' €';
            const amountClass = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';
            const typeLabel = transaction.type === 'income' ? 'Recette' : 'Dépense';
            const typeClass = transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            
            // Utilisation des champs en camelCase pour la lecture
            const factureLink = transaction.facture && transaction.facture.startsWith('http') ? transaction.facture : null;
            const factureContent = factureLink 
                ? `<a href="${factureLink}" target="_blank" class="text-blue-600 hover:text-blue-800 inline-flex items-center" title="Voir la facture">
                    <i class="fas fa-file-alt mr-1"></i> <i class="fas fa-external-link-alt text-xs"></i>
                   </a>`
                : `<span class="text-gray-400" title="Pas de facture"><i class="fas fa-file-alt"></i></span>`;

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formattedDate}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${transaction.description || ''}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${transaction.evenement || ''}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${transaction.proprietaire || ''}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${formatCategoryName(transaction.category)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountClass}">${formattedAmount}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                        ${typeLabel}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">${factureContent}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${transaction.id}" class="edit-btn text-indigo-600 hover:text-indigo-900 mr-3" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-id="${transaction.id}" class="delete-btn text-red-600 hover:text-red-900" title="Supprimer">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            transactionsTableBody.appendChild(row);
        });
    }

    updatePaginationControls(totalTransactionsCount, currentPage, itemsPerPage);
}

export function updatePaginationControls(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} sur ${totalPages || 1}`;
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}


// --- Fonctions de modal de transaction ---

export function openAddTransactionModal() {
    modalTitle.textContent = 'Ajouter une transaction';
    transactionIdInput.value = '';
    transactionForm.reset();
    transactionDateInput.valueAsDate = new Date();
    
    // Initialisation des champs supplémentaires en camelCase
    transactionEvenementInput.value = '';
    transactionProprietaireInput.value = '';
    transactionMoyenPaiementInput.value = '';
    transactionPaimentPlusInput.value = '';
    transactionFactureInput.value = '';
    
    transactionModal.classList.remove('hidden');
    currentTransactionDocId = null;
}

export function openEditTransactionModal(transaction) {
    modalTitle.textContent = 'Modifier la transaction';
    transactionIdInput.value = transaction.id;
    // transaction.date est déjà un objet Date JS
    transactionDateInput.value = formatDateToInput(transaction.date); 
    
    // Remplissage des champs supplémentaires en camelCase
    transactionEvenementInput.value = transaction.evenement || '';
    transactionProprietaireInput.value = transaction.proprietaire || '';
    transactionMoyenPaiementInput.value = transaction.moyenPaiement || '';
    transactionPaimentPlusInput.value = transaction.paiementPlus || '';
    transactionFactureInput.value = transaction.facture || '';
    
    transactionDescriptionInput.value = transaction.description || '';
    transactionCategorySelect.value = transaction.category || '';
    transactionAmountInput.value = transaction.amount || 0;
    transactionNotesInput.value = transaction.notes || '';
    
    for (const radioButton of transactionTypeRadios) {
        if (radioButton.value === transaction.type) {
            radioButton.checked = true;
            break;
        }
    }
    
    transactionModal.classList.remove('hidden');
    currentTransactionDocId = transaction.id;
}

export function closeTransactionModal() {
    transactionModal.classList.add('hidden');
    transactionForm.reset();
    currentTransactionDocId = null;
}

export function getTransactionFormData() {
    const date = parseInputDate(transactionDateInput.value);
    const description = transactionDescriptionInput.value;
    const category = transactionCategorySelect.value;
    // Utiliser safeParseFloat pour s'assurer que le montant est bien un nombre, gère les virgules
    const amount = safeParseFloat(transactionAmountInput.value); 
    const type = document.querySelector('input[name="transaction-type"]:checked').value;
    const notes = transactionNotesInput.value;

    // Récupération des valeurs des champs supplémentaires, pour les envoyer en camelCase
    const evenement = transactionEvenementInput.value;
    const proprietaire = transactionProprietaireInput.value;
    const moyenPaiement = transactionMoyenPaiementInput.value;
    const paimentPlus = transactionPaimentPlusInput.value;
    const facture = transactionFactureInput.value;

    return {
        id: currentTransactionDocId,
        date,
        description,
        evenement: evenement || null, // Clé en camelCase
        proprietaire: proprietaire || null, // Clé en camelCase
        category,
        amount,
        type,
        moyenPaiement: moyenPaiement || null, // Clé en camelCase
        paiementPlus: paimentPlus || null, // Clé en camelCase
        facture: facture || null, // Clé en camelCase
        notes: notes || null
    };
}

// --- Fonctions de modal de suppression ---

export function openDeleteModal(docId) {
    currentTransactionDocId = docId;
    deleteModal.classList.remove('hidden');
}

export function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    currentTransactionDocId = null;
}

export function getTransactionIdToDelete() {
    return currentTransactionDocId;
}

// --- Fonctions pour attacher les handlers externes ---

export function setupTableActionListeners(onEdit, onDelete) {
    transactionsTableBody.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('button');
        if (targetBtn) {
            const docId = targetBtn.dataset.id;
            if (targetBtn.classList.contains('edit-btn')) {
                onEdit(docId);
            } else if (targetBtn.classList.contains('delete-btn')) {
                onDelete(docId);
            }
        }
    });
}

// Fonctions pour gérer le spinner du bouton PDF
export function showPdfExportLoading() {
    exportPdfBtn.disabled = true;
    exportPdfButtonContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...';
    exportPdfBtn.classList.add('opacity-50', 'cursor-not-allowed'); 
}

export function hidePdfExportLoading() {
    exportPdfBtn.disabled = false;
    exportPdfButtonContent.innerHTML = originalExportBtnContent;
    exportPdfBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}
