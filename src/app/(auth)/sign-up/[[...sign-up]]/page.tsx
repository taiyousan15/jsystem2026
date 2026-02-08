export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">新規登録</h1>
        <p className="text-center text-gray-500">
          Clerk認証は外部API設定後に有効化されます
        </p>
      </div>
    </div>
  );
}
