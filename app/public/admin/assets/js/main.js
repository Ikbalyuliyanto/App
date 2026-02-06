// Kalau main.js kepanggil 2x, jangan redefine lagi
if (!window.__ADMIN_MAIN_LOADED__) {
  window.__ADMIN_MAIN_LOADED__ = true;

  // Sidebar Toggle
  document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", () => sidebar.classList.toggle("active"));
    }

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => sidebar.classList.remove("active"));
    }

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && sidebar && menuToggle) {
        const klikDiSidebar = sidebar.contains(e.target);
        const klikDiMenu = menuToggle.contains(e.target);
        if (!klikDiSidebar && !klikDiMenu) sidebar.classList.remove("active");
      }
    });
  });

  // Modal Functions (GLOBAL)
  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  document.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal")) {
      window.closeModal(e.target.id);
    }
  });

  // Pagination Helper (GLOBAL)
  window.Pagination = class Pagination {
    constructor(items, itemsPerPage = 10) {
      this.items = Array.isArray(items) ? items : [];
      this.itemsPerPage = itemsPerPage;
      this.currentPage = 1;
    }

    get totalPages() {
      return Math.ceil(this.items.length / this.itemsPerPage);
    }

    getCurrentItems() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.items.slice(start, end);
    }

    goToPage(page) {
      const p = Number(page);
      if (p >= 1 && p <= this.totalPages) {
        this.currentPage = p;
        return true;
      }
      return false;
    }

    nextPage() {
      return this.goToPage(this.currentPage + 1);
    }

    prevPage() {
      return this.goToPage(this.currentPage - 1);
    }

    renderPagination(containerId, onPageChange) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = "";
      if (this.totalPages <= 1) return;

      const prevBtn = document.createElement("button");
      prevBtn.className = "page-btn";
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.disabled = this.currentPage === 1;
      prevBtn.onclick = () => {
        if (this.prevPage()) onPageChange();
      };
      container.appendChild(prevBtn);

      if (this.totalPages <= 7) {
        for (let i = 1; i <= this.totalPages; i++) {
          container.appendChild(this.createPageButton(i, onPageChange));
        }
      } else {
        container.appendChild(this.createPageButton(1, onPageChange));

        if (this.currentPage > 3) container.appendChild(this.createEllipsis());

        for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(this.totalPages - 1, this.currentPage + 1); i++) {
          container.appendChild(this.createPageButton(i, onPageChange));
        }

        if (this.currentPage < this.totalPages - 2) container.appendChild(this.createEllipsis());

        container.appendChild(this.createPageButton(this.totalPages, onPageChange));
      }

      const nextBtn = document.createElement("button");
      nextBtn.className = "page-btn";
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.disabled = this.currentPage === this.totalPages || this.totalPages === 0;
      nextBtn.onclick = () => {
        if (this.nextPage()) onPageChange();
      };
      container.appendChild(nextBtn);
    }

    createEllipsis() {
      const el = document.createElement("span");
      el.textContent = "...";
      el.style.padding = "0 8px";
      return el;
    }

    createPageButton(pageNum, onPageChange) {
      const btn = document.createElement("button");
      btn.className = "page-btn" + (pageNum === this.currentPage ? " active" : "");
      btn.textContent = pageNum;
      btn.onclick = () => {
        if (this.goToPage(pageNum)) onPageChange();
      };
      return btn;
    }
  };

  // Image Preview (GLOBAL)
  window.handleImagePreview = (input, previewId) => {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById(previewId);
      if (!preview) return;
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  };
}
