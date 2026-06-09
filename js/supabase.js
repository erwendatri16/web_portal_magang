// =============================================
// INISIALISASI
// =============================================

let currentNomorPengajuan = '';

const SUPABASE_URL = 'https://ndtatoyctayebjszwvpz.supabase.co';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdGF0b3ljdGF5ZWJqc3p3dnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTUwNzIsImV4cCI6MjA5MzM3MTA3Mn0.eZ8ceZCDsNkIIKJZ6dWqY2TSPQB_7IziTXzkuf4VPpU';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('SUPABASE JS BERHASIL DIMUAT');

// =============================================
// HELPER: GENERATE NOMOR PENGAJUAN
// =============================================

function generateNomorPengajuan() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `MAGANG-${year}-${random}`;
}

// =============================================
// FORM PENDAFTARAN (hanya aktif di daftar.html)
// =============================================

const form = document.getElementById('internshipForm');

if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const btn = document.querySelector('.submit-btn');
        btn.disabled = true;
        btn.innerHTML = 'Mengirim Pengajuan...';

        try {
            const nomorPengajuan = generateNomorPengajuan();

            const suratFile = document.getElementById('surat_pengantar').files[0];
            const ktmFile   = document.getElementById('ktm').files[0];
            const cvFile    = document.getElementById('cv').files[0];

            // Upload Surat Pengantar
            const suratPath = `surat_pengantar/${Date.now()}_${suratFile.name}`;
            const suratUpload = await client.storage.from('internship').upload(suratPath, suratFile);
            if (suratUpload.error) throw suratUpload.error;

            // Upload KTM
            const ktmPath = `ktm/${Date.now()}_${ktmFile.name}`;
            const ktmUpload = await client.storage.from('internship').upload(ktmPath, ktmFile);
            if (ktmUpload.error) throw ktmUpload.error;

            // Upload CV
            const cvPath = `cv/${Date.now()}_${cvFile.name}`;
            const cvUpload = await client.storage.from('internship').upload(cvPath, cvFile);
            if (cvUpload.error) throw cvUpload.error;

            // Get Public URL
            const suratUrl = client.storage.from('internship').getPublicUrl(suratPath).data.publicUrl;
            const ktmUrl   = client.storage.from('internship').getPublicUrl(ktmPath).data.publicUrl;
            const cvUrl    = client.storage.from('internship').getPublicUrl(cvPath).data.publicUrl;

            // Insert ke database
            const insertResult = await client.from('internship_applications').insert({
                nomor_pengajuan:    nomorPengajuan,
                nama_lengkap:       document.getElementById('nama_lengkap').value,
                email:              document.getElementById('email').value,
                no_hp:              document.getElementById('no_hp').value,
                asal_kampus:        document.getElementById('asal_kampus').value,
                jurusan:            document.getElementById('jurusan').value,
                periode_mulai:      document.getElementById('periode_mulai').value,
                periode_selesai:    document.getElementById('periode_selesai').value,
                url_surat_pengantar: suratUrl,
                url_ktm:            ktmUrl,
                url_cv:             cvUrl,
                status:             'pending'
            });

            if (insertResult.error) throw insertResult.error;

            // Tampilkan modal sukses
            currentNomorPengajuan = nomorPengajuan;
            document.getElementById('nomorDisplay').innerText = nomorPengajuan;
            document.getElementById('successModal').style.display = 'flex';
            document.getElementById('internshipForm').reset();

        } catch (error) {
            console.error('ERROR SUBMIT:', error);
            alert('Gagal mengirim pengajuan.\n\n' + error.message);
        }

        btn.disabled = false;
        btn.innerHTML = 'Kirim Pengajuan';
    });
}

// =============================================
// STATISTIK HOMEPAGE (hanya aktif di index.html)
// =============================================
// FIX: Script dimuat SETELAH DOM selesai (posisi sebelum </body>),
// sehingga event DOMContentLoaded sudah lewat.
// Gunakan IIFE async agar langsung dieksekusi.
// =============================================

(async function loadStatistik() {

    const totalElement = document.getElementById('totalPendaftar');

    if (!totalElement) {
        console.log('BUKAN HALAMAN INDEX — statistik dilewati.');
        return;
    }

    console.log('MEMUAT STATISTIK...');

    try {
        // Cek error segera setelah masing-masing query (bukan setelah keduanya)
        const { data: settingsData, error: settingsError } =
            await client
                .from('internship_settings')
                .select('max_quota')
                .eq('id', 1)
                .single();

        console.log('SETTINGS:', settingsData, settingsError);

        if (settingsError) throw settingsError;

        const { data: applicationsData, error: applicationsError } =
            await client
                .from('internship_applications')
                .select('status');

        console.log('APPLICATIONS:', applicationsData, applicationsError);

        if (applicationsError) throw applicationsError;

        const total    = applicationsData.length;
        const diterima = applicationsData.filter(item => item.status === 'diterima').length;
        const pending  = applicationsData.filter(item => item.status === 'pending').length;
        const maxQuota = settingsData.max_quota;

        document.getElementById('totalPendaftar').innerText = total;
        document.getElementById('totalDiterima').innerText  = diterima;
        document.getElementById('totalPending').innerText   = pending;
        document.getElementById('sisaKuota').innerText      = Math.max(maxQuota - diterima, 0);

        console.log('STATISTIK BERHASIL DIMUAT ✓');

    } catch (e) {
        console.error('ERROR STATISTIK:', e);
    }

})();

// =============================================
// FUNGSI MODAL SUKSES
// =============================================

function copyNomor() {
    navigator.clipboard.writeText(currentNomorPengajuan);
    alert('Nomor pengajuan berhasil disalin');
}

function goToStatus() {
    window.location.href = `status.html?nomor=${currentNomorPengajuan}`;
}