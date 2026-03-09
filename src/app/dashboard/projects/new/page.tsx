import ProjectForm from '@/components/forms/ProjectForm';

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">
          Create New <span className="text-[#B45309]">Project</span>
        </h1>
        <p className="mt-3 text-lg text-[#57534E] max-w-2xl font-medium leading-relaxed">
          Launch a new meaningful project. Fill in the details below and generate your trackable sales page.
        </p>
        <div className="mt-8 border-b border-[#E7E5E4]"></div>
      </div>

      <ProjectForm mode="create" />
    </div>
  );
}
