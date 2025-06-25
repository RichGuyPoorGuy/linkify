
class QuickLinkManager {
    constructor() {
        this.links = this.loadLinks();
        this.categories = this.loadCategories();
        this.currentCategory = 'all';
        this.currentSubcategory = null;
        this.editingLinkId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.render();
        this.addCsvButton();
    }

    initializeElements() {
        this.elements = {
            addLinkBtn: document.getElementById('addLinkBtn'),
            modalOverlay: document.getElementById('modalOverlay'),
            closeBtn: document.getElementById('closeBtn'),
            linkForm: document.getElementById('linkForm'),
            fetchBtn: document.getElementById('fetchBtn'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            categoryList: document.getElementById('categoryList'),
            contentTitle: document.getElementById('contentTitle'),
            linksContainer: document.getElementById('linksContainer'),
            emptyState: document.getElementById('emptyState'),
            allCount: document.getElementById('allCount'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            
            categoryModalOverlay: document.getElementById('categoryModalOverlay'),
            closeCategoryBtn: document.getElementById('closeCategoryBtn'),
            categoryForm: document.getElementById('categoryForm'),
            categoryName: document.getElementById('categoryName'),
            cancelBtn: document.getElementById('cancelBtn'),
            cancelCategoryBtn: document.getElementById('cancelCategoryBtn'),
            
            linkUrl: document.getElementById('linkUrl'),
            linkTitle: document.getElementById('linkTitle'),
            linkCategory: document.getElementById('linkCategory')
        };
    }

    attachEventListeners() {
        // Modal controls - ONLY allow closing via cancel button
        this.elements.addLinkBtn.addEventListener('click', () => this.openAddModal());
        this.elements.closeBtn.addEventListener('click', () => this.closeAddModal());
        this.elements.cancelBtn.addEventListener('click', () => this.closeAddModal());

        // Category modal controls
        this.elements.addCategoryBtn.addEventListener('click', () => this.openCategoryModal());
        this.elements.closeCategoryBtn.addEventListener('click', () => this.closeCategoryModal());
        this.elements.cancelCategoryBtn.addEventListener('click', () => this.closeCategoryModal());
        this.elements.categoryModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.categoryModalOverlay) {
                this.closeCategoryModal();
            }
        });

        // Form submissions
        this.elements.linkForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.elements.categoryForm.addEventListener('submit', (e) => this.handleCategoryFormSubmit(e));
        
        // Fetch button
        this.elements.fetchBtn.addEventListener('click', () => this.fetchLinkInfo());
        
        // URL input change
        this.elements.linkUrl.addEventListener('input', () => {
            const url = this.elements.linkUrl.value;
            if (this.isValidUrl(url)) {
                this.elements.fetchBtn.style.display = 'block';
            } else {
                this.elements.fetchBtn.style.display = 'none';
            }
        });

        // Category clicks with event delegation
        this.elements.categoryList.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item');
            
            if (e.target.closest('.category-delete')) {
                e.preventDefault();
                e.stopPropagation();
                const categoryName = e.target.closest('.category-delete').dataset.category;
                this.deleteCategory(categoryName);
                return;
            }
            
            if (categoryItem) {
                const category = categoryItem.dataset.category;
                this.setActiveCategory(category);
            }
        });

        // Link actions with event delegation
        this.elements.linksContainer.addEventListener('click', (e) => {
            const linkCard = e.target.closest('.link-card');
            const subcategoryCard = e.target.closest('.subcategory-card');
            const actionBtn = e.target.closest('.action-btn');
            
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                const action = actionBtn.dataset.action;
                
                if (action === 'copy') {
                    this.copyLink(actionBtn.dataset.url);
                } else if (action === 'edit') {
                    this.editLink(parseInt(actionBtn.dataset.linkId));
                } else if (action === 'delete') {
                    this.deleteLink(parseInt(actionBtn.dataset.linkId));
                }
                return;
            }
            
            if (subcategoryCard) {
                const category = subcategoryCard.dataset.category;
                const subcategory = subcategoryCard.dataset.subcategory;
                this.setActiveCategory(category, subcategory);
                return;
            }
            
            if (linkCard && !e.target.closest('.link-actions')) {
                const url = linkCard.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            }
            
            if (e.target.closest('.empty-add-btn') || e.target.closest('.add-link-btn-inline')) {
                this.openAddModal();
            }
            
            if (e.target.closest('.add-subcategory-btn')) {
                const categoryName = e.target.closest('.add-subcategory-btn').dataset.category;
                this.addSubcategory(categoryName);
            }
        });

        // CSV button and other action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.csv-btn')) {
                this.openCsvModal();
            }
            
            if (e.target.closest('.edit-category-btn')) {
                this.editCategoryName();
            }
            
            if (e.target.closest('.edit-subcategory-btn')) {
                this.editSubcategoryName();
            }
            
            if (e.target.closest('.delete-subcategory-btn')) {
                this.deleteSubcategory(this.currentCategory, this.currentSubcategory);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAddModal();
                this.closeCategoryModal();
                this.closeCsvModal();
            }
        });
    }

    // ... keep existing code (modal management methods)
    openAddModal() {
        this.elements.modalOverlay.classList.add('active');
        this.elements.linkUrl.focus();
        this.updateCategoryOptions();
    }

    closeAddModal() {
        this.elements.modalOverlay.classList.remove('active');
        this.resetForm();
    }

    openCategoryModal() {
        this.elements.categoryModalOverlay.classList.add('active');
        this.elements.categoryName.focus();
        this.elements.categoryForm.reset();
    }

    closeCategoryModal() {
        this.elements.categoryModalOverlay.classList.remove('active');
        this.elements.categoryForm.reset();
    }

    openCsvModal() {
        if (!document.getElementById('csvModalOverlay')) {
            this.createCsvModal();
        }
        document.getElementById('csvModalOverlay').classList.add('active');
    }

    closeCsvModal() {
        const modal = document.getElementById('csvModalOverlay');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    createCsvModal() {
        const modalHtml = `
            <div class="modal-overlay" id="csvModalOverlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Import/Export CSV</h2>
                        <button class="close-btn" id="closeCsvModalBtn">×</button>
                    </div>
                    <div class="csv-content">
                        <div class="csv-section">
                            <h3>Export Links</h3>
                            <p>Download your links as a CSV file</p>
                            <button class="export-btn" id="exportCsvBtn">Export CSV</button>
                        </div>
                        <div class="csv-section">
                            <h3>Import Links</h3>
                            <p>Upload a CSV file to import links</p>
                            <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
                            <button class="import-btn" id="importCsvBtn">Choose CSV File</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listeners for CSV modal
        document.getElementById('closeCsvModalBtn').addEventListener('click', () => this.closeCsvModal());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCsv());
        document.getElementById('importCsvBtn').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });
        
        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importCsv(e.target.files[0]);
            }
        });
        
        document.getElementById('csvModalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'csvModalOverlay') {
                this.closeCsvModal();
            }
        });
    }

    exportCsv() {
        const headers = ['Title', 'URL', 'Category', 'Subcategory', 'Date Added'];
        const rows = this.links.map(link => [
            link.title || '',
            link.url || '',
            link.category || '',
            link.subcategory || '',
            link.dateAdded || ''
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `quick-links-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('CSV exported successfully!', 'success');
        this.closeCsvModal();
    }

    importCsv(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n').filter(line => line.trim());
                if (lines.length < 2) {
                    this.showToast('CSV file appears to be empty', 'error');
                    return;
                }
                
                const headers = this.parseCsvLine(lines[0]);
                let importedCount = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCsvLine(lines[i]);
                    if (values.length >= 2 && values[1]) { // Must have at least URL
                        const newLink = {
                            id: Date.now() + i,
                            title: values[0] || new URL(values[1]).hostname,
                            url: values[1],
                            category: values[2] || 'Uncategorized',
                            subcategory: values[3] || null,
                            favicon: `https://www.google.com/s2/favicons?domain=${new URL(values[1]).hostname}&sz=32`,
                            dateAdded: values[4] || new Date().toISOString()
                        };
                        
                        this.links.push(newLink);
                        
                        // Add category if it doesn't exist
                        if (!this.categories.find(cat => cat.name === newLink.category)) {
                            this.categories.push({
                                name: newLink.category,
                                subcategories: newLink.subcategory ? [newLink.subcategory] : [],
                                id: Date.now() + i
                            });
                        } else if (newLink.subcategory) {
                            const cat = this.categories.find(cat => cat.name === newLink.category);
                            if (cat && cat.subcategories && !cat.subcategories.includes(newLink.subcategory)) {
                                cat.subcategories.push(newLink.subcategory);
                            }
                        }
                        
                        importedCount++;
                    }
                }
                
                this.saveLinks();
                this.saveCategories();
                this.render();
                this.showToast(`Imported ${importedCount} links successfully!`, 'success');
                this.closeCsvModal();
            } catch (error) {
                console.error('CSV import error:', error);
                this.showToast('Error importing CSV file', 'error');
            }
        };
        reader.readAsText(file);
    }

    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    resetForm() {
        this.elements.linkForm.reset();
        this.elements.fetchBtn.style.display = 'none';
        this.elements.loadingSpinner.classList.remove('active');
        this.editingLinkId = null;
    }

    // ... keep existing code (URL validation and fetching methods)
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async fetchLinkInfo() {
        const url = this.elements.linkUrl.value;
        if (!this.isValidUrl(url)) return;

        this.elements.loadingSpinner.classList.add('active');
        this.elements.fetchBtn.disabled = true;

        try {
            const response = await this.simulateFetch(url);
            
            if (response.title) {
                this.elements.linkTitle.value = response.title;
            }
        } catch (error) {
            console.error('Failed to fetch link info:', error);
        } finally {
            this.elements.loadingSpinner.classList.remove('active');
            this.elements.fetchBtn.disabled = false;
        }
    }

    async simulateFetch(url) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const domain = new URL(url).hostname;
                const title = domain.charAt(0).toUpperCase() + domain.slice(1).replace('.com', '').replace('.org', '').replace('.net', '');
                resolve({
                    title: title,
                    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                });
            }, 1000);
        });
    }

    // ... keep existing code (form handling methods)
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const url = this.elements.linkUrl.value;
        const title = this.elements.linkTitle.value || new URL(url).hostname;
        let category = this.elements.linkCategory.value || 'Uncategorized';
        
        let subcategory = null;
        if (category.includes(' > ')) {
            const parts = category.split(' > ');
            category = parts[0];
            subcategory = parts[1];
        }

        const newLink = {
            id: this.editingLinkId || Date.now(),
            url,
            title,
            category,
            subcategory,
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
            dateAdded: new Date().toISOString()
        };

        if (this.editingLinkId) {
            const index = this.links.findIndex(link => link.id === this.editingLinkId);
            if (index !== -1) {
                this.links[index] = newLink;
            }
        } else {
            this.links.push(newLink);
        }

        if (!this.categories.find(cat => cat.name === category)) {
            this.categories.push({
                name: category,
                subcategories: subcategory ? [subcategory] : [],
                id: Date.now()
            });
            this.saveCategories();
        } else if (subcategory) {
            const cat = this.categories.find(cat => cat.name === category);
            if (cat && cat.subcategories && !cat.subcategories.includes(subcategory)) {
                cat.subcategories.push(subcategory);
                this.saveCategories();
            }
        }
        
        this.saveLinks();
        this.render();
        this.closeAddModal();
        this.showToast(this.editingLinkId ? 'Link updated successfully!' : 'Link added successfully!', 'success');
    }

    handleCategoryFormSubmit(e) {
        e.preventDefault();
        
        const name = this.elements.categoryName.value.trim();
        
        if (!name) return;

        if (this.categories.find(cat => cat.name === name)) {
            this.showToast('Category already exists!', 'error');
            return;
        }

        const newCategory = {
            name,
            subcategories: [],
            id: Date.now()
        };

        this.categories.push(newCategory);
        this.saveCategories();
        this.render();
        this.closeCategoryModal();
        this.showToast('Category added successfully!', 'success');
    }

    addSubcategory(categoryName) {
        const subcategoryName = prompt(`Enter subcategory name for "${categoryName}":`);
        if (!subcategoryName || !subcategoryName.trim()) return;

        const category = this.categories.find(cat => cat.name === categoryName);
        if (category) {
            if (!category.subcategories) category.subcategories = [];
            if (!category.subcategories.includes(subcategoryName.trim())) {
                category.subcategories.push(subcategoryName.trim());
                this.saveCategories();
                this.render();
                this.showToast('Subcategory added successfully!', 'success');
            } else {
                this.showToast('Subcategory already exists!', 'error');
            }
        }
    }

    editCategoryName() {
        if (this.currentCategory === 'all') return;
        
        const newName = prompt(`Enter new name for category "${this.currentCategory}":`, this.currentCategory);
        if (!newName || !newName.trim() || newName.trim() === this.currentCategory) return;

        if (this.categories.find(cat => cat.name === newName.trim())) {
            this.showToast('Category name already exists!', 'error');
            return;
        }

        // Update category name
        const category = this.categories.find(cat => cat.name === this.currentCategory);
        if (category) {
            const oldName = this.currentCategory;
            category.name = newName.trim();
            
            // Update all links with this category
            this.links.forEach(link => {
                if (link.category === oldName) {
                    link.category = newName.trim();
                }
            });
            
            this.currentCategory = newName.trim();
            this.saveLinks();
            this.saveCategories();
            this.render();
            this.setActiveCategory(newName.trim());
            this.showToast('Category renamed successfully!', 'success');
        }
    }

    editSubcategoryName() {
        if (!this.currentSubcategory) return;
        
        const newName = prompt(`Enter new name for subcategory "${this.currentSubcategory}":`, this.currentSubcategory);
        if (!newName || !newName.trim() || newName.trim() === this.currentSubcategory) return;

        const category = this.categories.find(cat => cat.name === this.currentCategory);
        if (category && category.subcategories && category.subcategories.includes(newName.trim())) {
            this.showToast('Subcategory name already exists!', 'error');
            return;
        }

        if (category) {
            const oldName = this.currentSubcategory;
            
            // Update subcategory name in category
            const index = category.subcategories.indexOf(oldName);
            if (index !== -1) {
                category.subcategories[index] = newName.trim();
            }
            
            // Update all links with this subcategory
            this.links.forEach(link => {
                if (link.category === this.currentCategory && link.subcategory === oldName) {
                    link.subcategory = newName.trim();
                }
            });
            
            this.currentSubcategory = newName.trim();
            this.saveLinks();
            this.saveCategories();
            this.render();
            this.setActiveCategory(this.currentCategory, newName.trim());
            this.showToast('Subcategory renamed successfully!', 'success');
        }
    }

    deleteLink(id) {
        this.links = this.links.filter(link => link.id !== id);
        this.saveLinks();
        this.render();
        this.showToast('Link deleted', 'info');
    }

    deleteCategory(categoryName) {
        if (categoryName === 'all') return;
        
        if (confirm(`Delete category "${categoryName}" and all its links?`)) {
            this.links = this.links.filter(link => link.category !== categoryName);
            this.categories = this.categories.filter(cat => cat.name !== categoryName);
            
            this.saveLinks();
            this.saveCategories();
            
            if (this.currentCategory === categoryName) {
                this.setActiveCategory('all');
            }
            
            this.render();
            this.showToast('Category deleted', 'info');
        }
    }

    deleteSubcategory(categoryName, subcategoryName) {
        if (confirm(`Delete subcategory "${subcategoryName}" and all its links?`)) {
            this.links = this.links.filter(link => 
                !(link.category === categoryName && link.subcategory === subcategoryName)
            );
            
            const category = this.categories.find(cat => cat.name === categoryName);
            if (category && category.subcategories) {
                category.subcategories = category.subcategories.filter(sub => sub !== subcategoryName);
            }
            
            this.saveLinks();
            this.saveCategories();
            
            this.setActiveCategory(categoryName);
            this.render();
            this.showToast('Subcategory deleted', 'info');
        }
    }

    updateCategoryOptions() {
        const select = this.elements.linkCategory;
        select.innerHTML = '<option value="">Select category...</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
            
            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories.forEach(subcategory => {
                    const subOption = document.createElement('option');
                    subOption.value = `${category.name} > ${subcategory}`;
                    subOption.textContent = `  └ ${subcategory}`;
                    select.appendChild(subOption);
                });
            }
        });
    }

    setActiveCategory(category, subcategory = null) {
        this.currentCategory = category;
        this.currentSubcategory = subcategory;
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (subcategory) {
            this.elements.contentTitle.innerHTML = `
                <span>${category} > ${subcategory}</span>
                <div class="title-actions">
                    <button class="edit-subcategory-btn" title="Edit Subcategory Name">✏️</button>
                    <button class="delete-subcategory-btn" title="Delete Subcategory">🗑️</button>
                </div>
            `;
        } else {
            const activeItem = document.querySelector(`[data-category="${category}"]:not([data-subcategory])`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
            
            if (category === 'all') {
                this.elements.contentTitle.textContent = 'All Links';
            } else {
                this.elements.contentTitle.innerHTML = `
                    <span>${category}</span>
                    <div class="title-actions">
                        <button class="edit-category-btn" title="Edit Category Name">✏️</button>
                    </div>
                `;
            }
        }
        
        this.renderLinks();
    }

    render() {
        this.renderCategories();
        this.renderLinks();
        this.addCsvButton();
    }

    addCsvButton() {
        const existingCsvBtn = document.querySelector('.csv-btn');
        if (existingCsvBtn) {
            existingCsvBtn.remove();
        }
        
        const addLinkBtn = document.getElementById('addLinkBtn');
        if (addLinkBtn && addLinkBtn.parentNode) {
            const csvBtn = document.createElement('button');
            csvBtn.className = 'csv-btn';
            csvBtn.innerHTML = '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-chart-column-increasing-icon lucide-file-chart-column-increasing"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2"/><path d="M12 18v-4"/><path d="M16 18v-6"/></svg></span> CSV';
            csvBtn.title = 'Import/Export CSV';
            
            // Insert BEFORE the add link button
            addLinkBtn.parentNode.insertBefore(csvBtn, addLinkBtn);
        }
    }

    renderCategories() {
        const existingCategories = this.elements.categoryList.querySelectorAll('.category-item:not([data-category="all"])');
        existingCategories.forEach(item => item.remove());
        
        this.categories.forEach(category => {
            const count = this.links.filter(link => link.category === category.name).length;
            const categoryElement = this.createCategoryElement(category, count);
            this.elements.categoryList.appendChild(categoryElement);
        });
        
        this.elements.allCount.textContent = this.links.length;
    }

    createCategoryElement(category, count) {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.category = category.name;
        
        const icon = category.name === 'Work' ? '💼' : 
                    category.name === 'Personal' ? '👤' :
                    category.name === 'Social' ? '🌐' :
                    category.name === 'Tools' ? '🔧' :
                    category.name === 'Learning' ? '📚' :
                    category.name === 'Bookmarks' ? '⭐' : '📁';
        
        item.innerHTML = `
            <span class="category-icon">${icon}</span>
            <span class="category-name">${category.name}</span>
            <span class="category-count">${count}</span>
            <button class="category-delete" data-category="${category.name}" title="Delete category">🗑️</button>
        `;
        
        return item;
    }

    renderLinks() {
        const filteredLinks = this.getFilteredLinks();
        const subcategories = this.getSubcategoriesForCurrentCategory();
        
        let content = '';
        
        if (this.currentCategory !== 'all' && !this.currentSubcategory && subcategories.length > 0) {
            content += '<div class="subcategories-section"><h3>Subcategories</h3><div class="subcategory-cards">';
            subcategories.forEach(subcategory => {
                const subCount = this.links.filter(link => 
                    link.category === this.currentCategory && link.subcategory === subcategory
                ).length;
                content += this.createSubcategoryCard(this.currentCategory, subcategory, subCount);
            });
            content += '</div></div>';
        }
        
        if (this.currentCategory !== 'all' && !this.currentSubcategory) {
            content += `
                <div class="action-buttons">
                    <button class="add-link-btn-inline">➕ Add Link</button>
                    <button class="add-subcategory-btn" data-category="${this.currentCategory}">📁 Add Subcategory</button>
                </div>
            `;
        }
        
        if (filteredLinks.length > 0) {
            content += '<div class="links-section">';
            if (this.currentCategory !== 'all' || this.currentSubcategory) {
                content += '<h3>Links</h3>';
            }
            content += '<div class="links-grid">';
            filteredLinks.sort((a, b) => a.title.localeCompare(b.title));
            filteredLinks.forEach(link => {
                content += this.createLinkElement(link);
            });
            content += '</div></div>';
        } else if (this.currentCategory === 'all') {
            content = `
                <div class="empty-state">
                    <div class="empty-icon">🔗</div>
                    <p>No links yet</p>
                    <button class="empty-add-btn">Add Link</button>
                </div>
            `;
        } else if (this.currentSubcategory) {
            content += `
                <div class="empty-state">
                    <div class="empty-icon">🔗</div>
                    <p>No links in this subcategory</p>
                    <button class="empty-add-btn">Add Link</button>
                </div>
            `;
        }
        
        this.elements.linksContainer.innerHTML = content;
    }

    getFilteredLinks() {
        if (this.currentCategory === 'all') {
            return this.links;
        }
        
        if (this.currentSubcategory) {
            return this.links.filter(link => 
                link.category === this.currentCategory && link.subcategory === this.currentSubcategory
            );
        }
        
        return this.links.filter(link => 
            link.category === this.currentCategory && !link.subcategory
        );
    }

    getSubcategoriesForCurrentCategory() {
        if (this.currentCategory === 'all') return [];
        
        const category = this.categories.find(cat => cat.name === this.currentCategory);
        return category && category.subcategories ? category.subcategories : [];
    }

    createSubcategoryCard(categoryName, subcategoryName, count) {
        return `
            <div class="subcategory-card" data-category="${categoryName}" data-subcategory="${subcategoryName}">
                <div class="subcategory-card-header">
                    <span class="subcategory-card-icon">📁</span>
                    <h4 class="subcategory-card-title">${subcategoryName}</h4>
                </div>
                <div class="subcategory-card-count">${count} links</div>
            </div>
        `;
    }

    createLinkElement(link) {
        return `
            <div class="link-card" data-url="${link.url}">
                <div class="link-header">
                    <img class="link-favicon" src="${link.favicon}" alt="" onerror="this.style.display='none'">
                    <h3 class="link-title">${this.escapeHtml(link.title)}</h3>
                    <div class="link-actions">
                        <button class="action-btn" data-action="copy" data-url="${link.url}" title="Copy URL">📋</button>
                        <button class="action-btn" data-action="edit" data-link-id="${link.id}" title="Edit">✏️</button>
                        <button class="action-btn" data-action="delete" data-link-id="${link.id}" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="link-meta">
                    <span class="link-category">${link.subcategory ? `${link.category} > ${link.subcategory}` : link.category}</span>
                    <span class="link-url">${this.shortenUrl(link.url)}</span>
                </div>
            </div>
        `;
    }

    // ... keep existing code (utility methods)
    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('URL copied to clipboard!', 'success');
        });
    }

    editLink(id) {
        const link = this.links.find(l => l.id === id);
        if (link) {
            this.editingLinkId = id;
            this.elements.linkUrl.value = link.url;
            this.elements.linkTitle.value = link.title;
            this.openAddModal();
            
            setTimeout(() => {
                const categoryValue = link.subcategory ? `${link.category} > ${link.subcategory}` : link.category;
                this.elements.linkCategory.value = categoryValue;
            }, 100);
        }
    }

    shortenUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
        } catch {
            return url;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#ef4444' : '#6b7280'};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            z-index: 10000;
            font-size: 0.8rem;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // ... keep existing code (data persistence methods)
    loadLinks() {
        const saved = localStorage.getItem('quickLinks');
        return saved ? JSON.parse(saved) : [];
    }

    saveLinks() {
        localStorage.setItem('quickLinks', JSON.stringify(this.links));
    }

    loadCategories() {
        const saved = localStorage.getItem('quickCategories');
        const defaultCategories = [{ name: 'Bookmarks', id: 1, subcategories: [] }];
        return saved ? JSON.parse(saved) : defaultCategories;
    }

    saveCategories() {
        localStorage.setItem('quickCategories', JSON.stringify(this.categories));
    }
}

window.openAddModal = () => quickLinkManager.openAddModal();
window.closeAddModal = () => quickLinkManager.closeAddModal();
window.closeCategoryModal = () => quickLinkManager.closeCategoryModal();

const quickLinkManager = new QuickLinkManager();

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .subcategories-section h3,
    .links-section h3 {
        margin: 20px 0 15px 0;
        color: #fff;
        font-size: 1.1rem;
        font-weight: 600;
    }
    
    .subcategory-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
    }
    
    .subcategory-card {
        background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
        border: 1px solid #333;
        border-radius: 8px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
    }
    
    .subcategory-card:hover {
        transform: translateY(-2px);
        border-color: #555;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .subcategory-card-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    
    .subcategory-card-icon {
        font-size: 2rem;
    }
    
    .subcategory-card-title {
        color: #fff;
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
    }
    
    .subcategory-card-count {
        color: #888;
        font-size: 0.8rem;
        margin-top: 8px;
    }
    
    .action-buttons {
        display: flex;
        gap: 10px;
        margin: 20px 0;
        justify-content: center;
    }
    
    .add-link-btn-inline,
    .add-subcategory-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid #555;
        color: #ccc;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s ease;
    }
    
    .add-link-btn-inline:hover,
    .add-subcategory-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: #777;
        color: #fff;
    }
    
    .links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
    }
    
    .csv-btn {
        background: rgba(255,255,255,0.1);
        border: 1px solid #555;
        color: #ccc;
        padding: 8px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        margin-right: -190px;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    
    .csv-btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: #777;
        color: #fff;
    }
    
    .csv-content {
        display: flex;
        gap: 20px;
        flex-direction: column;
    }
    
    .csv-section {
        padding: 15px;
        border: 1px solid #333;
        border-radius: 6px;
        background: rgba(255,255,255,0.02);
    }
    
    .csv-section h3 {
        margin: 0 0 10px 0;
        color: #fff;
        font-size: 1rem;
    }
    
    .csv-section p {
        margin: 0 0 15px 0;
        color: #ccc;
        font-size: 0.8rem;
    }
    
    .export-btn, .import-btn {
        background: #007a2d;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s ease;
    }
    
    .export-btn:hover, .import-btn:hover {
        background:rgb(18, 109, 52);
    }
    
    .delete-subcategory-btn {
        background:rgba(220, 38, 38, 0.78);
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.7rem;
        transition: all 0.2s ease;
    }
    
    .delete-subcategory-btn:hover {
        background: #b91c1c;
    }
    
    .edit-category-btn,
    .edit-subcategory-btn {
        background: #6b7280;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.7rem;
        margin-right: 8px;
        transition: all 0.2s ease;
    }
    
    .edit-category-btn:hover,
    .edit-subcategory-btn:hover {
        background: #4b5563;
    }
    
    .content-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .title-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }
`;
document.head.appendChild(style);