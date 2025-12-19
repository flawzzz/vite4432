export default function About() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-indigo-600">MyApp</h1>
                    <span className="text-sm text-gray-500">About</span>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        About This App
                    </h2>
                    <p className="text-lg text-gray-600 mb-4">
                        This is a simple React + Vite example project with a Home and About page.
                    </p>
                    <p className="text-lg text-gray-600">
                        Customize these pages to match your own project, layout, and branding.
                    </p>
                </div>
            </main>
        </div>
    );
}
