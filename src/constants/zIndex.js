/**
 * Z-Index 계층 관리
 * 일관된 z-index 사용으로 컴포넌트 겹침 문제 해결
 */

export const ZINDEX = {
  // 기본 요소
  DEFAULT: 0,
  
  // 드롭다운, 팝오버
  DROPDOWN: 40,
  
  // 주요 모달 (검색, 상세정보 모달)
  MODAL: 50,
  
  // 상단 모달 (평점 선택, 삭제 확인 등)
  MODAL_OVERLAY: 60,
  
  // 고정 헤더/네비게이션
  NAVBAR: 50,
  
  // 토스트/알림 (추후 사용)
  TOAST: 70,
};
