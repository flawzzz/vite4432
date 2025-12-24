export default function Privacy() {
  return (
    <div className="flex flex-1 flex-col px-4 py-10">
      <main className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
        <p className="text-sm text-slate-400">
          Dunmoa(이하 “서비스”)는 던파모바일 정보를 열람/검색/시뮬레이션하는 팬메이드 도구입니다.
          서비스는 최소한의 개인정보만 처리하며, 아래와 같이 개인정보를 처리합니다.
        </p>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
          <div className="font-semibold text-slate-200">요약</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>회원가입/로그인 기능이 없으며, 이름/전화번호/이메일 등은 직접 수집하지 않습니다.</li>
            <li>시뮬레이터 일부 기능은 브라우저 로컬 저장소(LocalStorage)에 선택한 세팅을 저장할 수 있습니다.</li>
            <li>서비스 운영 과정에서 접속 로그(IP 등)가 웹 서버에 의해 자동 생성될 수 있습니다.</li>
          </ul>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. 처리하는 개인정보의 항목</h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="text-slate-400">
              서비스는 원칙적으로 이용자가 직접 입력하는 개인정보(성명, 연락처 등)를 수집하지 않습니다.
            </p>
            <div>
              <div className="text-xs font-semibold text-slate-200">(1) 자동 생성/수집될 수 있는 정보</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-300">
                <li>IP 주소, 접속 일시, 접속 기록, 사용자 에이전트(브라우저/OS 정보) 등</li>
                <li>오류 발생 시, 오류 로그(브라우저 콘솔/네트워크 상태 등)가 자동 기록될 수 있음</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">(2) 기기 내 저장 정보(로컬 저장소)</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-300">
                <li>
                  아이템 시뮬레이터에서 선택한 장비/슬롯 정보 등 편의 기능을 위해 브라우저 로컬 저장소에 저장될 수 있습니다.
                </li>
                <li>로컬 저장소 데이터는 이용자 브라우저에만 저장되며, 서비스 서버로 전송되지 않습니다.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. 개인정보의 처리 목적</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>서비스 제공 및 기능 동작(검색/목록 표시/시뮬레이션 결과 표시)</li>
            <li>서비스 안정성 확보(오류 확인, 품질 개선, 부정 이용 방지)</li>
            <li>이용자 편의 제공(로컬 저장소를 통한 설정/선택 값 유지)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. 개인정보의 보유 및 이용기간</h2>
          <div className="text-sm text-slate-300">
            <p>
              로컬 저장소에 저장된 데이터는 이용자가 브라우저에서 삭제하기 전까지 보관될 수 있습니다.
              자동 생성되는 접속 로그는 서비스 운영/보안 점검을 위해 필요한 기간 동안 보관될 수 있으며,
              보관 목적이 달성되면 지체 없이 파기합니다.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. 개인정보의 제3자 제공</h2>
          <p className="text-sm text-slate-300">
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 법령에 근거한 요청이 있는 경우에는 예외로 할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. 개인정보 처리 위탁</h2>
          <p className="text-sm text-slate-300">
            서비스는 원칙적으로 개인정보 처리 업무를 외부에 위탁하지 않습니다.
            다만, 호스팅/배포 환경(예: 웹 서버/정적 파일 제공)에서 운영을 위해 최소한의 접속 로그가 처리될 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. 이용자의 권리 및 행사 방법</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>로컬 저장소 데이터: 이용자는 브라우저 설정에서 언제든지 삭제할 수 있습니다.</li>
            <li>자동 생성 로그 관련: 법령상 권리 행사에 대해서는 아래 문의처로 요청할 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. 쿠키(Cookie) 및 유사 기술</h2>
          <p className="text-sm text-slate-300">
            서비스는 필수 기능 제공을 위해 브라우저 로컬 저장소를 사용할 수 있습니다.
            쿠키를 통한 맞춤형 광고/추적을 목적으로 하는 기능은 기본적으로 포함하지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. 개인정보의 안전성 확보조치</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>서비스 운영에 필요한 최소한의 정보만 처리</li>
            <li>기기 내 저장(로컬 저장소) 데이터는 이용자 브라우저에만 저장</li>
            <li>취약점/오류 확인을 통한 개선 노력</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">9. 개인정보처리방침의 변경</h2>
          <p className="text-sm text-slate-300">
            본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 경우 서비스 내 공지 또는 본 페이지를 통해 안내합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">10. 문의처</h2>
          <p className="text-sm text-slate-300">
            개인정보 관련 문의는 서비스 운영 채널(추후 제공)로 요청해 주세요.
            현재는 별도 고객센터/이메일을 운영하지 않을 수 있습니다.
          </p>
        </section>

        <p className="pt-2 text-xs text-slate-500">시행일: 2025-12-25</p>
      </main>
    </div>
  );
}
