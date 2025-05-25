// reports.js (Inchangé)
import { formatCategoryName } from './utils.js';

const monthlyChartCanvas = document.getElementById('monthly-chart');
const expensesChartCanvas = document.getElementById('expenses-chart');
const categorySummaryBody = document.getElementById('category-summary');

let monthlyChartInstance = null;
let expensesChartInstance = null;

// --- Fonctions de graphique ---

export function renderCharts(transactions) {
    renderMonthlyChart(transactions);
    renderExpensesChart(transactions);
}

export function renderMonthlyChart(transactions) {
    const ctx = monthlyChartCanvas.getContext('2d');
    
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);
    
    transactions.forEach(transaction => {
        let transactionDate;
        if (transaction.date && typeof transaction.date.toDate === 'function') { // Firestore Timestamp
            transactionDate = transaction.date.toDate();
        } else if (transaction.date instanceof Date) { // JavaScript Date object
            transactionDate = transaction.date;
        } else if (typeof transaction.date === 'string') { // String date (e.g., from manual input or fallback)
            const parts = transaction.date.split('/');
            transactionDate = (parts.length === 3) ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : null;
        } else {
            transactionDate = null;
        }

        if (!transactionDate || isNaN(transactionDate.getTime())) return; // Skip invalid dates
        
        const month = transactionDate.getMonth();
        const amount = transaction.amount || 0;
        
        if (transaction.type === 'income') {
            incomeData[month] += amount;
        } else {
            expenseData[month] += amount;
        }
    });
    
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }
    
    monthlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Recettes',
                    data: incomeData,
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Dépenses',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' €';
                        }
                    }
                }
            }
        }
    });
}

export function renderExpensesChart(transactions) {
    const ctx = expensesChartCanvas.getContext('2d');
    
    const expensesByCategory = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
        const category = transaction.category || 'Non catégorisé';
        const amount = transaction.amount || 0;
        
        if (!expensesByCategory[category]) {
            expensesByCategory[category] = 0;
        }
        
        expensesByCategory[category] += amount;
    });
    
    const categories = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);
    
    const backgroundColors = [
        'rgba(54, 162, 235, 0.8)', // Blue
        'rgba(255, 99, 132, 0.8)', // Red
        'rgba(255, 206, 86, 0.8)', // Yellow
        'rgba(75, 192, 192, 0.8)', // Teal
        'rgba(153, 102, 255, 0.8)', // Purple
        'rgba(255, 159, 64, 0.8)', // Orange
        'rgba(199, 199, 199, 0.8)', // Gray
        'rgba(83, 102, 255, 0.8)', // Indigo
        'rgba(40, 159, 64, 0.8)', // Green
        'rgba(210, 199, 199, 0.8)' // Light Gray
    ];
    
    if (expensesChartInstance) {
        expensesChartInstance.destroy();
    }
    
    expensesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(formatCategoryName),
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors.slice(0, categories.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${value.toFixed(2)} € (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

export function destroyCharts() {
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
    }
    if (expensesChartInstance) {
        expensesChartInstance.destroy();
        expensesChartInstance = null;
    }
}

// --- Fonctions de résumé par catégorie ---

export function renderCategorySummary(transactions) {
    categorySummaryBody.innerHTML = '';
    
    const categorySummary = {};
    
    transactions.forEach(transaction => {
        const category = transaction.category || 'Non catégorisé';
        const amount = transaction.amount || 0;
        const type = transaction.type;
        
        if (!categorySummary[category]) {
            categorySummary[category] = {
                income: 0,
                expense: 0
            };
        }
        
        if (type === 'income') {
            categorySummary[category].income += amount;
        } else {
            categorySummary[category].expense += amount;
        }
    });
    
    const sortedCategories = Object.keys(categorySummary).sort((a, b) => {
        const balanceA = categorySummary[a].income - categorySummary[a].expense;
        const balanceB = categorySummary[b].income - categorySummary[b].expense;
        return balanceB - balanceA;
    });
    
    sortedCategories.forEach(category => {
        const income = categorySummary[category].income;
        const expense = categorySummary[category].expense;
        const balance = income - expense;
        
        const row = document.createElement('tr');
        const balanceClass = balance >= 0 ? 'text-green-600' : 'text-red-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCategoryName(category)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">${income.toFixed(2).replace('.', ',')} €</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">${expense.toFixed(2).replace('.', ',')} €</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${balanceClass}">${balance.toFixed(2).replace('.', ',')} €</td>
        `;
        
        categorySummaryBody.appendChild(row);
    });
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
            
    const totalBalance = totalIncome - totalExpense;
    const totalBalanceClass = totalBalance >= 0 ? 'text-green-600' : 'text-red-600';
    
    const totalRow = document.createElement('tr');
    totalRow.className = 'bg-gray-50 font-semibold';
    totalRow.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">${totalIncome.toFixed(2).replace('.', ',')} €</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">${totalExpense.toFixed(2).replace('.', ',')} €</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${totalBalanceClass}">${totalBalance.toFixed(2).replace('.', ',')} €</td>
    `;
    
    categorySummaryBody.appendChild(totalRow);
}