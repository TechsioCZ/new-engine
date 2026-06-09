export type CompanyAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "createCompany"
    | "delete"
    | "edit"
    | "editCustomerDetails"
    | "editDetails"
    | "manageCustomerGroup"
    | "save",
    string
  >
  approvalSettings: Record<
    | "adminApprovalDescription"
    | "adminApprovalLabel"
    | "badgeAdmin"
    | "badgeNone"
    | "badgeSalesManager"
    | "salesManagerApprovalDescription"
    | "salesManagerApprovalLabel"
    | "title",
    string
  >
  columns: Record<
    | "actions"
    | "address"
    | "approvalSettings"
    | "city"
    | "company"
    | "currency"
    | "customerGroup"
    | "email"
    | "employees"
    | "name"
    | "phone"
    | "spendingLimit"
    | "state",
    string
  >
  customerGroup: Record<
    "add" | "empty" | "hint" | "remove" | "title" | "titleFallback",
    string
  >
  employees: Record<
    | "adminBadge"
    | "adminDescription"
    | "adminLabel"
    | "adminTooltip"
    | "createTitle"
    | "details"
    | "editTitle"
    | "emptyMessage"
    | "emptyTitle"
    | "firstName"
    | "lastName"
    | "permissions"
    | "spendingLimitWithCurrency"
    | "title",
    string
  >
  errors: Record<
    | "companyNotFound"
    | "createCustomerFailed"
    | "createEmployeeFailed"
    | "missingEmployeeDetails"
    | "saveErrorPrefix"
    | "saving"
    | "updateApprovalSettingsFailed"
    | "updateCompanyFailed"
    | "updateCustomerGroupFailed"
    | "removeCustomerGroupFailed",
    string
  >
  fields: Record<
    | "address"
    | "city"
    | "country"
    | "currency"
    | "email"
    | "logoUrl"
    | "name"
    | "phone"
    | "spendingLimit"
    | "state"
    | "zip",
    string
  >
  form: Record<"selectCountry" | "selectCurrency", string>
  menuItem: string
  placeholders: Record<
    | "address"
    | "city"
    | "email"
    | "employeeEmail"
    | "firstName"
    | "lastName"
    | "logoUrl"
    | "name"
    | "phone"
    | "spendingLimit"
    | "state"
    | "zip",
    string
  >
  prompts: Record<"deleteDescription" | "deleteTitle", string>
  status: Record<"loading" | "saving", string>
  toasts: Record<
    | "approvalSettingsUpdated"
    | "companyAddedToCustomerGroup"
    | "companyDeleted"
    | "companyRemovedFromCustomerGroup"
    | "companyUpdated"
    | "employeeCreated"
    | "employeeDeleted"
    | "employeeUpdated",
    string
  >
}

export const companyAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      createCompany: "Vytvořit firmu",
      delete: "Smazat",
      edit: "Upravit",
      editCustomerDetails: "Upravit detaily zákazníka",
      editDetails: "Upravit detaily",
      manageCustomerGroup: "Spravovat zákaznickou skupinu",
      save: "Uložit",
    },
    approvalSettings: {
      adminApprovalDescription:
        "Vyžadovat schválení administrátorem firmy pro všechny objednávky této firmy.",
      adminApprovalLabel: "Vyžaduje schválení administrátorem",
      badgeAdmin: "Vyžaduje schválení administrátorem",
      badgeNone: "Schválení není vyžadováno",
      badgeSalesManager: "Vyžaduje schválení obchodním manažerem",
      salesManagerApprovalDescription:
        "Vyžadovat schválení obchodním manažerem pro všechny objednávky této firmy.",
      salesManagerApprovalLabel: "Vyžaduje schválení obchodním manažerem",
      title: "Nastavení schvalování firmy",
    },
    columns: {
      actions: "Akce",
      address: "Adresa",
      approvalSettings: "Nastavení schvalování",
      city: "Město",
      company: "Firma",
      currency: "Měna",
      customerGroup: "Zákaznická skupina",
      email: "E-mail",
      employees: "Zaměstnanci",
      name: "Název",
      phone: "Telefon",
      spendingLimit: "Limit útraty",
      state: "Kraj/stát",
    },
    customerGroup: {
      add: "Přidat",
      empty: "Nebyly nalezeny žádné zákaznické skupiny",
      hint: "Přidáním firmy {{name}} do zákaznické skupiny se do skupiny automaticky přidá {{count}} propojených zaměstnanců.",
      remove: "Odebrat",
      title: "Přidat {{name}} do zákaznické skupiny",
      titleFallback: "Přidat firmu do zákaznické skupiny",
    },
    employees: {
      adminBadge: "Admin",
      adminDescription: "Zapnutím udělíte administrátorský přístup",
      adminLabel: "Administrátorský přístup",
      adminTooltip:
        "Administrátoři mohou spravovat detaily firmy a oprávnění zaměstnanců.",
      createTitle: "Přidat zákazníka firmy",
      details: "Detaily",
      editTitle: "Upravit zaměstnance",
      emptyMessage: "Tato firma nemá žádné zaměstnance.",
      emptyTitle: "Žádné záznamy",
      firstName: "Jméno",
      lastName: "Příjmení",
      permissions: "Oprávnění",
      spendingLimitWithCurrency: "Limit útraty ({{currency}})",
      title: "Zaměstnanci",
    },
    errors: {
      companyNotFound: "Firma nebyla nalezena",
      createCustomerFailed: "Zákazníka se nepodařilo vytvořit",
      createEmployeeFailed: "Zaměstnance se nepodařilo vytvořit",
      missingEmployeeDetails: "Chybí povinné údaje zaměstnance",
      removeCustomerGroupFailed:
        "Firmu se nepodařilo odebrat ze zákaznické skupiny",
      saveErrorPrefix: "Chyba:",
      saving: "Ukládám...",
      updateApprovalSettingsFailed:
        "Nastavení schvalování firmy se nepodařilo uložit",
      updateCompanyFailed: "Firmu se nepodařilo upravit",
      updateCustomerGroupFailed:
        "Firmu se nepodařilo přidat do zákaznické skupiny",
    },
    fields: {
      address: "Adresa firmy",
      city: "Město firmy",
      country: "Země firmy",
      currency: "Měna",
      email: "E-mail firmy",
      logoUrl: "URL loga firmy",
      name: "Název firmy",
      phone: "Telefon firmy",
      spendingLimit: "Limit útraty",
      state: "Kraj/stát firmy",
      zip: "PSČ firmy",
    },
    form: {
      selectCountry: "Vyberte zemi",
      selectCurrency: "Vyberte měnu",
    },
    menuItem: "Firmy",
    placeholders: {
      address: "Václavské náměstí 1",
      city: "Praha",
      email: "firma@example.com",
      employeeEmail: "jan.novak@example.com",
      firstName: "Jan",
      lastName: "Novák",
      logoUrl: "https://example.com/logo.png",
      name: "Medusa",
      phone: "+420 123 456 789",
      spendingLimit: "1000",
      state: "Praha",
      zip: "110 00",
    },
    prompts: {
      deleteDescription:
        "Opravdu chcete tuto položku smazat? Tuto akci nelze vrátit zpět.",
      deleteTitle: "Potvrdit smazání",
    },
    status: {
      loading: "Načítám...",
      saving: "Ukládám...",
    },
    toasts: {
      approvalSettingsUpdated: "Nastavení schvalování firmy bylo uloženo",
      companyAddedToCustomerGroup: "Firma byla přidána do zákaznické skupiny",
      companyDeleted: "Firma {{name}} byla smazána",
      companyRemovedFromCustomerGroup:
        "Firma byla odebrána ze zákaznické skupiny",
      companyUpdated: "Firma {{name}} byla upravena",
      employeeCreated: "Zaměstnanec {{name}} byl vytvořen",
      employeeDeleted: "Zaměstnanec byl smazán",
      employeeUpdated: "Zaměstnanec {{email}} byl upraven",
    },
  },
  en: {
    actions: {
      add: "Add",
      cancel: "Cancel",
      createCompany: "Create Company",
      delete: "Delete",
      edit: "Edit",
      editCustomerDetails: "Edit Customer Details",
      editDetails: "Edit details",
      manageCustomerGroup: "Manage customer group",
      save: "Save",
    },
    approvalSettings: {
      adminApprovalDescription:
        "Require company admin approval for all orders placed by this company.",
      adminApprovalLabel: "Requires Admin Approval",
      badgeAdmin: "Requires admin approval",
      badgeNone: "No approval required",
      badgeSalesManager: "Requires sales manager approval",
      salesManagerApprovalDescription:
        "Require sales manager approval for all orders placed by this company.",
      salesManagerApprovalLabel: "Requires Sales Manager Approval",
      title: "Company Approval Settings",
    },
    columns: {
      actions: "Actions",
      address: "Address",
      approvalSettings: "Approval Settings",
      city: "City",
      company: "Company",
      currency: "Currency",
      customerGroup: "Customer Group",
      email: "Email",
      employees: "Employees",
      name: "Name",
      phone: "Phone",
      spendingLimit: "Spending Limit",
      state: "State",
    },
    customerGroup: {
      add: "Add",
      empty: "No customer groups found",
      hint: "Adding {{name}} to a customer group will automatically add {{count}} linked employee(s) to the customer group.",
      remove: "Remove",
      title: "Add {{name}} to a Customer Group",
      titleFallback: "Add company to a Customer Group",
    },
    employees: {
      adminBadge: "Admin",
      adminDescription: "Enable to grant admin access",
      adminLabel: "Admin Access",
      adminTooltip:
        "Admins can manage the company's details and employee permissions.",
      createTitle: "Add Company Customer",
      details: "Details",
      editTitle: "Edit Employee",
      emptyMessage: "This company doesn't have any employees.",
      emptyTitle: "No records",
      firstName: "First Name",
      lastName: "Last Name",
      permissions: "Permissions",
      spendingLimitWithCurrency: "Spending Limit ({{currency}})",
      title: "Employees",
    },
    errors: {
      companyNotFound: "Company not found",
      createCustomerFailed: "Failed to create customer",
      createEmployeeFailed: "Failed to create employee",
      missingEmployeeDetails: "Missing required employee details",
      removeCustomerGroupFailed: "Failed to remove company from customer group",
      saveErrorPrefix: "Error:",
      saving: "Saving...",
      updateApprovalSettingsFailed:
        "Failed to update company approval settings",
      updateCompanyFailed: "Failed to update company",
      updateCustomerGroupFailed: "Failed to add company to customer group",
    },
    fields: {
      address: "Company Address",
      city: "Company City",
      country: "Company Country",
      currency: "Currency",
      email: "Company Email",
      logoUrl: "Company Logo URL",
      name: "Company Name",
      phone: "Company Phone",
      spendingLimit: "Spending Limit",
      state: "Company State",
      zip: "Company Zip",
    },
    form: {
      selectCountry: "Select a country",
      selectCurrency: "Select a currency",
    },
    menuItem: "Companies",
    placeholders: {
      address: "1234 Main St",
      city: "New York",
      email: "medusa@medusa.com",
      employeeEmail: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      logoUrl: "https://example.com/logo.png",
      name: "Medusa",
      phone: "1234567890",
      spendingLimit: "1000",
      state: "NY",
      zip: "10001",
    },
    prompts: {
      deleteDescription:
        "Are you sure you want to delete this item? This action cannot be undone.",
      deleteTitle: "Confirm Deletion",
    },
    status: {
      loading: "Loading...",
      saving: "Saving...",
    },
    toasts: {
      approvalSettingsUpdated: "Company approval settings updated successfully",
      companyAddedToCustomerGroup:
        "Company added to customer group successfully",
      companyDeleted: "Company {{name}} deleted successfully",
      companyRemovedFromCustomerGroup:
        "Company removed from customer group successfully",
      companyUpdated: "Company {{name}} updated successfully",
      employeeCreated: "Employee {{name}} created successfully",
      employeeDeleted: "Employee deleted successfully",
      employeeUpdated: "Employee {{email}} updated successfully",
    },
  },
} satisfies Record<"cs" | "en", CompanyAdminI18nNamespace>
