import ProjectForm from '@/components/forms/ProjectForm';

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
          Create New Project
        </h1>
        <p className="mt-3 text-lg text-gray-500 max-w-2xl text-balance leading-relaxed">
          Launch a new meaningful project. Fill in the details below and click &quot;Save &amp; Publish&quot; to generate your trackable sales page.
        </p>
        <div className="mt-6 border-b border-gray-200"></div>
      </div>

      <ProjectForm mode="create" />
    </div>
  );
}
