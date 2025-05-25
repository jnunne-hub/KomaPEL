export function formatCategoryName(category) {
    if (!category) return 'Non catégorisé';
    return String(category)
        .split(/[\s-]+/) // Split by space or hyphen
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function formatDateToInput(date) {
    if (date && typeof date.toDate === 'function') {
        date = date.toDate();
    }
    if (!(date instanceof Date) || isNaN(date)) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseInputDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

export function safeParseFloat(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanedValue = value.replace(/"/g, '').replace(',', '.').trim();
        const parsed = parseFloat(cleanedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}