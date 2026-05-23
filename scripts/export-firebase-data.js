const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Firebase service account not found at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const storage = admin.storage();

/**
 * Export all data from Firebase Firestore organized by company
 * Creates a JSON file with all collections and documents
 */
async function exportFirebaseData() {
  try {
    console.log('🔄 Starting Firebase data export...\n');

    const exportData = {
      timestamp: new Date().toISOString(),
      companies: {}
    };

    // Step 1: Get all companies
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`📦 Found ${companiesSnapshot.size} companies\n`);

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const companyData = companyDoc.data();

      console.log(`\n📂 Exporting company: ${companyId}`);
      console.log(`   Name: ${companyData.name}`);

      const companyExport = {
        metadata: companyData,
        collections: {}
      };

      // Collections to export for each company
      const collectionsToExport = [
        'users',
        'roles',
        'permissions',
        'sensitive_field_access',
        'branches',
        'shop_settings',
        'items',
        'item_categories',
        'inventory',
        'invoices',
        'invoice_items',
        'payments',
        'returns',
        'audit_logs',
        'documents',
        'batches'
      ];

      // Step 2: Export each collection for this company
      for (const collectionName of collectionsToExport) {
        try {
          const collectionRef = db.collection(`companies/${companyId}/${collectionName}`);
          const snapshot = await collectionRef.get();

          if (snapshot.size > 0) {
            const documents = {};
            snapshot.forEach(doc => {
              documents[doc.id] = {
                id: doc.id,
                ...doc.data(),
                // Convert timestamps to ISO strings
                _exported_at: new Date().toISOString()
              };
            });

            companyExport.collections[collectionName] = {
              count: snapshot.size,
              documents: documents
            };

            console.log(`   ✓ ${collectionName}: ${snapshot.size} documents`);
          } else {
            console.log(`   ○ ${collectionName}: empty`);
          }
        } catch (error) {
          console.warn(`   ⚠ Error exporting ${collectionName}:`, error.message);
        }
      }

      // Step 3: Export storage files for this company
      try {
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles({ prefix: `${companyId}/` });

        if (files.length > 0) {
          companyExport.storage = {
            files: []
          };

          for (const file of files) {
            companyExport.storage.files.push({
              path: file.name,
              size: file.metadata.size,
              contentType: file.metadata.contentType,
              timeCreated: file.metadata.timeCreated,
              updated: file.metadata.updated
            });
          }

          console.log(`   ✓ Storage: ${files.length} files`);
        }
      } catch (error) {
        console.warn(`   ⚠ Error exporting storage:`, error.message);
      }

      exportData.companies[companyId] = companyExport;
    }

    // Step 4: Save export to file
    const exportDir = path.join(process.cwd(), 'firebase-export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, `firebase-export-${new Date().getTime()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Export complete!`);
    console.log(`📄 File saved: ${exportPath}`);
    console.log(`📊 Total companies: ${Object.keys(exportData.companies).length}`);

    return exportPath;
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

/**
 * Download Firebase Storage files locally for backup
 */
async function downloadStorageFiles() {
  try {
    console.log('\n🔄 Starting Firebase Storage backup...\n');

    const bucket = storage.bucket();
    const [files] = await bucket.getFiles();

    const storageDir = path.join(process.cwd(), 'firebase-storage-backup');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    let downloadedCount = 0;
    for (const file of files) {
      try {
        const filePath = path.join(storageDir, file.name);
        const fileDir = path.dirname(filePath);

        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        await file.download({ destination: filePath });
        downloadedCount++;
        console.log(`✓ Downloaded: ${file.name}`);
      } catch (error) {
        console.warn(`⚠ Failed to download ${file.name}:`, error.message);
      }
    }

    console.log(`\n✅ Storage backup complete!`);
    console.log(`📁 Directory: ${storageDir}`);
    console.log(`📦 Files downloaded: ${downloadedCount}`);

  } catch (error) {
    console.error('❌ Storage backup failed:', error);
  }
}

// Run exports
(async () => {
  await exportFirebaseData();
  await downloadStorageFiles();
  process.exit(0);
})();
