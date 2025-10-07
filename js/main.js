import { db } from './config.js';
import { registerAuthCallback } from './auth.js';
import * as transactionsCRUD from './transactions-crud.js';
import * as ui from './ui.js';
import * as reports from './reports.js';
import { parseInputDate, safeParseFloat, formatCategoryName } from './utils.js';

// Variables globales de l'application
let transactions = []; // Contient toutes les transactions brutes de Firestore
let filteredAndSortedTransactions = []; // Contient les transactions après filtres et tri
let currentPage = 1;
const itemsPerPage = 10; // Nombre d'éléments par page
let sortColumn = 'date'; // Colonne de tri par défaut
let sortDirection = 'desc'; // Direction de tri par défaut ('asc' ou 'desc')

let currentSchoolYear = ''; 

const transactionsColRef = db.collection('transactions');

// Fonction pour obtenir l'année scolaire d'une date
function getSchoolYearForDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const month = dateObj.getMonth(); // 0 for Jan, 11 for Dec
    const year = dateObj.getFullYear();

    let startYear;
    // L'année scolaire commence en septembre (mois 8)
    if (month >= 8) { // Septembre (8) à Décembre (11)
        startYear = year;
    } else { // Janvier (0) à Août (7)
        startYear = year - 1;
    }
    return `${startYear}-${startYear + 1}`;
}

// Fonction pour remplir le sélecteur d'année scolaire
function populateSchoolYearSelect(allTransactions) {
    const uniqueYears = new Set();
    allTransactions.forEach(t => {
        // La date est déjà un objet Date JS standard
        if (t.date && !isNaN(t.date.getTime())) {
            uniqueYears.add(getSchoolYearForDate(t.date));
        }
    });

    const todaySchoolYear = getSchoolYearForDate(new Date());
    uniqueYears.add(todaySchoolYear); 

    const sortedYears = Array.from(uniqueYears).sort().reverse(); 

    ui.schoolYearSelect.innerHTML = ''; 
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `Année scolaire ${year}`;
        ui.schoolYearSelect.appendChild(option);
    });

    if (sortedYears.includes(currentSchoolYear)) {
        ui.schoolYearSelect.value = currentSchoolYear;
    } else if (sortedYears.length > 0) {
        ui.schoolYearSelect.value = sortedYears[0];
        currentSchoolYear = sortedYears[0];
    } else {
        ui.schoolYearSelect.value = todaySchoolYear;
        currentSchoolYear = todaySchoolYear;
    }
}


// --- Fonctions de filtrage, tri et pagination ---

function applyAllFilters(allTransactions) {
    const typeFilterVal = ui.filterType.value;
    const categoryFilterVal = ui.filterCategory.value;
    const dateFilterVal = ui.filterDate.value;
    const searchTerm = ui.searchTermInput.value.toLowerCase().trim();

    let filtered = [...allTransactions];
    
    // FILTRE : Année scolaire sélectionnée (Appliqué en premier)
    if (currentSchoolYear) {
        filtered = filtered.filter(t => {
            // t.date est déjà un objet Date JS standard
            return t.date && getSchoolYearForDate(t.date) === currentSchoolYear;
        });
    }

    // Filtrage par type
    if (typeFilterVal !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilterVal);
    }
    
    // Filtrage par catégorie
    if (categoryFilterVal !== 'all') {
        filtered = filtered.filter(t => t.category && t.category.toLowerCase() === categoryFilterVal.toLowerCase());
    }
    
    // Filtrage par période (mois/trimestre)
    if (dateFilterVal !== 'all') {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        filtered = filtered.filter(t => {
            let transactionDate = t.date; // C'est déjà un objet Date JS
            if (!transactionDate || isNaN(transactionDate.getTime())) return false; 

            const transactionMonth = transactionDate.getMonth();
            const transactionYear = transactionDate.getFullYear();

            if (dateFilterVal === 'current-month') {
                return transactionMonth === currentMonth && transactionYear === currentYear;
            } else if (dateFilterVal === 'last-month') {
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
                return transactionMonth === lastMonth && transactionYear === yearOfLastMonth;
            } else if (dateFilterVal === 'current-trimester') {
                const currentTrimester = Math.floor(currentMonth / 3);
                return Math.floor(transactionMonth / 3) === currentTrimester && transactionYear === currentYear;
            }
            return true;
        });
    }

    // Filtrage par terme de recherche sur Description, Événement et Propriétaire
    if (searchTerm) {
        filtered = filtered.filter(t => {
            const desc = (t.description || '').toLowerCase();
            // Utilisation des noms de champs normalisés (camelCase)
            const evenement = (t.evenement || '').toLowerCase(); 
            const proprietaire = (t.proprietaire || '').toLowerCase(); 
            return desc.includes(searchTerm) || evenement.includes(searchTerm) || proprietaire.includes(searchTerm);
        });
    }

    return filtered;
}

function applySorting(transactionsToSort) {
    const sorted = [...transactionsToSort]; 

    sorted.sort((a, b) => {
        let valA, valB;

        if (sortColumn === 'date') {
            // La date est déjà un objet Date JS ici
            valA = a.date instanceof Date ? a.date.getTime() : 0;
            valB = b.date instanceof Date ? b.date.getTime() : 0;
        } else if (sortColumn === 'amount') {
            valA = a.amount || 0;
            valB = b.amount || 0;
        } else if (sortColumn === 'type') {
            valA = a.type || '';
            valB = b.type || '';
        } else if (sortColumn === 'category') {
            valA = a.category || '';
            valB = b.category || '';
        } else if (sortColumn === 'description') {
            valA = a.description || '';
            valB = b.description || '';
        } else if (sortColumn === 'evenement') { 
            valA = a.evenement || ''; // Utilisation du camelCase
            valB = b.evenement || ''; // Utilisation du camelCase
        } else if (sortColumn === 'proprietaire') { 
            valA = a.proprietaire || ''; // Utilisation du camelCase
            valB = b.proprietaire || ''; // Utilisation du camelCase
        } else {
            // Fallback pour le tri par date
            valA = a.date instanceof Date ? a.date.getTime() : 0;
            valB = b.date instanceof Date ? b.date.getTime() : 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            const comparison = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
            return sortDirection === 'asc' ? comparison : -comparison;
        } else {
            const comparison = valA - valB;
            return sortDirection === 'asc' ? comparison : -comparison;
        }
    });

    return sorted;
}


// --- Fonctions de gestion des données et de l'affichage ---

function refreshDashboardUI() {
    const filtered = applyAllFilters(transactions); 
    filteredAndSortedTransactions = applySorting(filtered);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const transactionsToDisplay = filteredAndSortedTransactions.slice(startIndex, endIndex);

    ui.renderTransactionsTable(transactionsToDisplay, filteredAndSortedTransactions.length, currentPage, itemsPerPage);
    // Passer toutes les transactions non filtrées aux fonctions de résumé et de graphiques pour l'année scolaire en cours
    // Cela permet aux graphiques d'utiliser toutes les données de l'année, indépendamment des filtres de la table.
    const transactionsForReports = applyAllFilters(transactions); // Réappliquer le filtre d'année scolaire
    ui.updateSummary(transactionsForReports); 
    ui.initCategoryFilter(transactionsForReports); 
    
    if (!ui.sectionReport.classList.contains('hidden')) {
        reports.renderCharts(transactionsForReports); 
        reports.renderCategorySummary(transactionsForReports); 
    }

    document.querySelectorAll('th[data-sort-key]').forEach(header => {
        const key = header.dataset.sortKey;
        header.classList.remove('sorted-asc', 'sorted-desc');
        const icon = header.querySelector('i.fas'); // Changed to select the icon specifically
        if (icon) {
            icon.classList.remove('fa-sort-up', 'fa-sort-down', 'fa-sort');
            if (sortColumn === key) {
                header.classList.add(`sorted-${sortDirection}`);
                icon.classList.add(sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.add('fa-sort'); 
            }
        }
    });
}

async function handleSaveTransaction(formData) {
    const transactionData = {
        date: firebase.firestore.Timestamp.fromDate(formData.date), // formData.date est déjà un objet Date JS
        description: formData.description,
        // Utilisation des noms de champs normalisés (camelCase) pour l'enregistrement
        evenement: formData.evenement || null, 
        proprietaire: formData.proprietaire || null, 
        category: formData.category,
        amount: formData.amount,
        type: formData.type,
        moyenPaiement: formData.moyenPaiement || null, 
        paiementPlus: formData.paiementPlus || null, 
        facture: formData.facture || null, 
        notes: formData.notes || null 
    };

    try {
        if (formData.id) {
            await transactionsCRUD.updateTransaction(formData.id, transactionData);
        } else {
            await transactionsCRUD.addTransaction(transactionData);
        }
        ui.closeTransactionModal();
    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        alert("Erreur lors de l'enregistrement: " + error.message);
    }
}

async function handleDeleteTransaction() {
    const docId = ui.getTransactionIdToDelete();
    if (!docId) return;

    try {
        await transactionsCRUD.deleteTransaction(docId);
        ui.closeDeleteModal();
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression: " + error.message);
    }
}

// Fonction d'exportation PDF
async function exportReportToPdf() {
    ui.showPdfExportLoading(); // Afficher le spinner et désactiver le bouton

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4'); // 'p' for portrait, 'pt' for points, 'a4' for A4 size
    const margin = 40; // Margins from the PDF edge
    let yPos = margin; // Current Y position on the PDF page
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    try {
        // Title
        pdf.setFontSize(18);
        pdf.text("Bilan Annuel APEL - Année scolaire " + currentSchoolYear, pageWidth / 2, yPos, { align: "center" });
        yPos += 30; 

        // Elements to capture (make sure they are visible before capturing!)
        const elementsToCapture = [
            { id: 'monthly-chart-container', title: 'Évolution mensuelle' },
            { id: 'expenses-chart-container', title: 'Répartition des dépenses' },
            { id: 'category-summary-container', title: 'Résumé par catégorie' }
        ];

        for (const elementInfo of elementsToCapture) {
            const element = document.getElementById(elementInfo.id);
            if (!element) {
                console.warn(`Element with ID ${elementInfo.id} not found.`);
                continue;
            }
            
            // For Chart.js canvases, it's better to capture the canvas itself directly
            // rather than its container, for better rendering fidelity.
            let canvasToCapture = element.querySelector('canvas');
            let targetElement = element; // Default to container for tables etc.
            if (canvasToCapture) {
                targetElement = canvasToCapture;
            }

            const canvas = await html2canvas(targetElement, { 
                scale: 2, 
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - (2 * margin);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yPos + imgHeight + 30 > pageHeight - margin && yPos !== margin) { // Add space for title + image
                pdf.addPage();
                yPos = margin;
            }

            pdf.setFontSize(14);
            pdf.text(elementInfo.title, margin, yPos);
            yPos += 20; 

            pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 20; 
        }

        pdf.save(`Bilan_APEL_${currentSchoolYear}.pdf`);

    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        alert("Erreur lors de la génération du PDF: " + error.message);
    } finally {
        ui.hidePdfExportLoading(); // Cacher le spinner et réactiver le bouton
    }
}

// --- Initialisation de l'application ---

document.addEventListener('DOMContentLoaded', function() {
    currentSchoolYear = getSchoolYearForDate(new Date());
    
    ui.tabTransactions.addEventListener('click', function() {
        ui.tabTransactions.classList.add('tab-active');
        ui.tabReport.classList.remove('tab-active');
        ui.sectionTransactions.classList.remove('hidden');
        ui.sectionReport.classList.add('hidden');
        refreshDashboardUI(); 
    });
    
    ui.tabReport.addEventListener('click', function() {
        ui.tabReport.classList.add('tab-active');
        ui.tabTransactions.classList.remove('tab-active');
        ui.sectionReport.classList.remove('hidden');
        ui.sectionTransactions.classList.add('hidden');
        const transactionsForReports = applyAllFilters(transactions); // Réappliquer le filtre d'année scolaire
        reports.renderCharts(transactionsForReports); 
        reports.renderCategorySummary(transactionsForReports); 
    });
    
    ui.filterType.addEventListener('change', () => { currentPage = 1; refreshDashboardUI(); });
    ui.filterCategory.addEventListener('change', () => { currentPage = 1; refreshDashboardUI(); });
    ui.filterDate.addEventListener('change', () => { currentPage = 1; refreshDashboardUI(); });
    ui.searchTermInput.addEventListener('keyup', () => { currentPage = 1; refreshDashboardUI(); });

    ui.schoolYearSelect.addEventListener('change', () => {
        currentSchoolYear = ui.schoolYearSelect.value;
        currentPage = 1; 
        refreshDashboardUI(); 
    });

    document.querySelectorAll('th[data-sort-key]').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.dataset.sortKey;
            if (sortColumn === key) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = key;
                sortDirection = 'desc'; 
            }
            currentPage = 1; 
            refreshDashboardUI();
        });
    });

    ui.prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            refreshDashboardUI();
        }
    });
    ui.nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            refreshDashboardUI();
        }
    });
    
    ui.addTransactionBtn.addEventListener('click', ui.openAddTransactionModal);
    ui.cancelTransactionBtn.addEventListener('click', ui.closeTransactionModal);
    ui.closeModalXBtn.addEventListener('click', ui.closeTransactionModal); 
    ui.transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = ui.getTransactionFormData();
        handleSaveTransaction(formData);
    });
    
    ui.setupTableActionListeners(
        (docId) => { 
            const transactionToEdit = transactions.find(t => t.id === docId);
            if (transactionToEdit) {
                ui.openEditTransactionModal(transactionToEdit);
            }
        },
        (docId) => { 
            ui.openDeleteModal(docId);
        }
    );

    ui.cancelDeleteBtn.addEventListener('click', ui.closeDeleteModal);
    ui.confirmDeleteBtn.addEventListener('click', handleDeleteTransaction);

    ui.exportPdfBtn.addEventListener('click', exportReportToPdf);

    registerAuthCallback(async (user) => {
        if (user) {
            transactionsColRef.onSnapshot((snapshot) => {
                transactions = snapshot.docs.map(doc => {
                    const rawData = doc.data(); 
                    
                    let transformedAmount = safeParseFloat(rawData.amount || rawData.Montant || 0);
                    
                    let transformedType = 'expense'; // Default value

                    // Priorité 1 : Le champ 'type' (celui qui est enregistré par le dashboard)
                    if (rawData.type === 'income' || rawData.type === 'expense') {
                        transformedType = rawData.type;
                    }
                    // Priorité 2 : Le champ 'Type' (celui potentiellement issu de l'import CSV)
                    else if (rawData.Type) {
                        const rawCsvType = String(rawData.Type).toLowerCase().trim();
                        if (rawCsvType === 'recette' || rawCsvType === 'income') {
                            transformedType = 'income';
                        } else if (rawCsvType === 'depense' || rawCsvType === 'expense') {
                            transformedType = 'expense';
                        }
                    }
                    
                    // Standardisation de la catégorie
                    let category = String(rawData.category || rawData.Categorie || '').trim();
                    category = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    const csvCategoryMap = {
                        'evenement': 'evenement', 'noel': 'evenement', 'saint nicolas': 'evenement', 'carnaval': 'evenement', 
                        'fete des grand-meres': 'evenement', 'paques': 'evenement', 'chandeleur': 'evenement', 
                        'recre gourmande': 'evenement', 'marche de printemps': 'evenement', 'kermesse': 'evenement', 
                        
                        'banque': 'banque', 'fact bnp': 'banque', 'commision bnp': 'banque', 'depot billet': 'banque', 
                        'depot piece': 'banque', 'frais bancaire': 'banque', 'frais bancaire (regul)': 'banque', 
                        'depot cheque': 'banque', 'retrocession reclamations': 'banque', 'activation carte': 'banque', 
            
                        'cadeau': 'cadeau', 'cadeaux classe': 'cadeau', 'cadeaux mme celine': 'cadeau', 
                        'cadeaux mme stephanie': 'cadeau', 'cadeaux isabelle': 'cadeau',
                        
                        'Recré gourmande': 'produits', 'callendrier': 'produits', 'catalogue': 'produits', 'shein catalogue printemps': 'produits',
                        'foir fouille catalogue printemps': 'produits', 'action catalogue': 'produits', 
                        'eco affaire thermo': 'produits', 'sumup marche de printemps': 'produits',
                        'renvoi colis la poste': 'produits', 'regul ligne 96': 'produits', 
                        'depot especes monnaie': 'produits', 'depot cheque (printemps)': 'produits',
                        'depot especes billets': 'produits', 'depot especes billets (gd meres)': 'produits',
                        'initiatives tombola': 'produits',
                        
                        'equipement': 'equipement', 'brico reparation but foot': 'equipement', 
                        'trafic podium': 'equipement', 'bazar tang podium': 'equipement',
                        
                        'fournitures': 'fournitures', 'intermarche bonbons': 'fournitures', 
                        'photo manquantes': 'fournitures', 'proxi cafe': 'fournitures',

                        'cotisations': 'cotisations', 'dons': 'dons', 'subventions': 'subventions', 'sorties': 'sorties',
                        'brocante': 'brocante'
                    };
            
                    const mappedCategory = csvCategoryMap[category];
                    if (mappedCategory) {
                        category = mappedCategory;
                    } else {
                        const validCategories = [
                            "cotisations", "evenement", "dons", "subventions", "fournitures", 
                            "sorties", "equipement", "banque", "cadeau", "brocante", "produits", "autre"
                        ];
                        if (!validCategories.includes(category)) {
                            category = "autre";
                        }
                    }

                    // --- Correction CRUCIALE pour les dates ---
                    let transactionDateObj = null;
                    // Tente de récupérer la date depuis 'date' (lowercase) ou 'Date' (PascalCase)
                    const rawDateValue = rawData.date || rawData.Date; 

                    if (rawDateValue) {
                        if (typeof rawDateValue.toDate === 'function') { // C'est un Firestore Timestamp
                            transactionDateObj = rawDateValue.toDate(); // Convertit en Date JS
                        } else if (rawDateValue instanceof Date) { // C'est déjà un Date JS
                            transactionDateObj = rawDateValue;
                        } else if (typeof rawDateValue === 'string') { // C'est une chaîne, essaie de la parser
                            const parts = rawDateValue.split('/');
                            if (parts.length === 3) { // Format DD/MM/YYYY
                                // Utilise Date.UTC pour éviter les problèmes de fuseau horaire
                                transactionDateObj = new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
                            } else {
                                // Essaie le format YYYY-MM-DD ou d'autres formats reconnus par new Date()
                                transactionDateObj = new Date(rawDateValue); 
                            }
                        }
                    }
                    
                    // Fallback à new Date(0) si après toutes les tentatives, la date est invalide
                    if (!transactionDateObj || isNaN(transactionDateObj.getTime())) {
                        transactionDateObj = new Date(0); 
                    }
                    // --- Fin de correction des dates ---

                    const transformedTransaction = {
                        id: doc.id,
                        date: transactionDateObj, // Stocke toujours un objet Date JS
                        description: rawData.description || rawData.Description || '', 
                        // Lecture des champs en camelCase en priorité, avec fallback PascalCase pour compatibilité
                        evenement: rawData.evenement || rawData.Evenement || '',
                        proprietaire: rawData.proprietaire || rawData.Propriétaire || '',
                        category: category,
                        amount: transformedAmount,
                        type: transformedType,
                        moyenPaiement: rawData.moyenPaiement || rawData['Moyen Paiement'] || '',
                        paiementPlus: rawData.paiementPlus || rawData['Paiment Plus'] || '',
                        facture: rawData.facture || rawData.Facture || '',
                        notes: rawData.notes || '', 
                    };

                    return transformedTransaction;
                })
                .filter(t => t.amount > 0 || (t.description && t.description.trim() !== ''));

                console.log("Données des transactions transformées et filtrées (finales):", transactions);
                
                populateSchoolYearSelect(transactions); 
                
                refreshDashboardUI(); 
            }, (error) => {
                console.error("Erreur lors du chargement des transactions:", error);
                alert("Erreur lors du chargement des transactions: " + error.message);
            });
        } else {
            transactions = [];
            filteredAndSortedTransactions = [];
            currentPage = 1; 
            refreshDashboardUI(); 
            reports.destroyCharts(); 

            ui.schoolYearSelect.innerHTML = '';
        }
    });
});
